// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  // Role Selection State
  const [role, setRole] = useState(null);

  // Authentication States
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Admin States
  const [newFacultyUsername, setNewFacultyUsername] = useState('');
  const [newFacultyPassword, setNewFacultyPassword] = useState('');
  const [newFacultyName, setNewFacultyName] = useState('');
  const [generatedPrivateKey, setGeneratedPrivateKey] = useState('');

  // Attendance States
  const [privateKey, setPrivateKey] = useState('');
  const [action, setAction] = useState('Check-In');
  const [records, setRecords] = useState([]);
  const [facultyStatus, setFacultyStatus] = useState(null); // 'checked-in' or 'checked-out'

  // Key Management States
  const [facultyList, setFacultyList] = useState([]);
  const [showFacultyKeys, setShowFacultyKeys] = useState(false);
  const [showRetrieveKeyModal, setShowRetrieveKeyModal] = useState(false);
  const [retrievedKey, setRetrievedKey] = useState('');
  const [keyLookupUsername, setKeyLookupUsername] = useState('');
  const [keyLookupPassword, setKeyLookupPassword] = useState('');

  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const response = await axios.get(`${API_URL}/attendance`);
      setRecords(response.data);
    } catch (error) {
      console.error("Error fetching records:", error);
    }
  };

  // ADMIN LOGIN
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/auth/admin-login`, { username, password });
      setUser(res.data);
      setUsername('');
      setPassword('');
      alert("Admin Login Successful!");
    } catch (error) {
      alert("Invalid Admin Credentials");
    }
  };

  // ADMIN CREATE FACULTY
  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    if (!newFacultyUsername || !newFacultyPassword || !newFacultyName) {
      return alert("Please fill in all fields");
    }

    try {
      const res = await axios.post(`${API_URL}/admin/create-faculty`, {
        username: newFacultyUsername,
        password: newFacultyPassword,
        name: newFacultyName
      });

      setGeneratedPrivateKey(res.data.privateKeyToGiveToFaculty);
      setNewFacultyUsername('');
      setNewFacultyPassword('');
      setNewFacultyName('');
      alert("Faculty account created successfully!");
    } catch (error) {
      alert(error.response?.data?.error || "Error creating account");
    }
  };

  // FACULTY LOGIN
  const handleFacultyLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { username, password });
      setUser(res.data);
      setUsername('');
      setPassword('');
      
      // Fetch records and determine faculty's current status
      const recordsRes = await axios.get(`${API_URL}/attendance`);
      const facultyRecords = recordsRes.data.filter(record => record.facultyName === res.data.name);
      
      if (facultyRecords.length > 0) {
        const latestRecord = facultyRecords[0]; // Most recent (sorted by -_id)
        setFacultyStatus(latestRecord.action === 'Check-In' ? 'checked-in' : 'checked-out');
        // Set the available action
        setAction(latestRecord.action === 'Check-In' ? 'Check-Out' : 'Check-In');
      } else {
        // No records yet, they can check in
        setFacultyStatus('checked-out');
        setAction('Check-In');
      }
      
      alert("Login Successful!");
    } catch (error) {
      alert("Invalid Credentials");
    }
  };

  // FACULTY ATTENDANCE
  const handleAttendance = async (e) => {
    e.preventDefault();
    if (!privateKey) return alert("You must provide your secret DSA Private Key!");

    try {
      await axios.post(`${API_URL}/attendance`, {
        username: user.username,
        action,
        privateKey
      });
      alert(`${action} Verified and Saved!`);
      setPrivateKey('');
      
      // Update status after successful check-in/out
      setFacultyStatus(action === 'Check-In' ? 'checked-in' : 'checked-out');
      setAction(action === 'Check-In' ? 'Check-Out' : 'Check-In');
      
      fetchRecords();
    } catch (error) {
      alert(error.response?.data?.message || "Authentication Failed.");
    }
  };

  // CLEAR ALL LOGS
  const handleClearLogs = async () => {
    if (window.confirm("Are you sure you want to delete ALL attendance logs? This cannot be undone!")) {
      try {
        await axios.delete(`${API_URL}/attendance/clear`);
        alert("All logs have been cleared!");
        fetchRecords();
      } catch (error) {
        alert("Error clearing logs: " + (error.response?.data?.error || error.message));
      }
    }
  };

  // FETCH ALL FACULTY KEYS (ADMIN VIEW)
  const handleFetchFacultyList = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/faculty-list`);
      setFacultyList(response.data);
      setShowFacultyKeys(!showFacultyKeys);
    } catch (error) {
      alert("Error fetching faculty list: " + (error.response?.data?.error || error.message));
    }
  };

  // FACULTY RETRIEVE THEIR OWN KEY
  const handleRetrieveKey = async (e) => {
    e.preventDefault();
    if (!keyLookupUsername || !keyLookupPassword) {
      return alert("Please enter your username and password");
    }

    try {
      const response = await axios.post(`${API_URL}/faculty/retrieve-key`, {
        username: keyLookupUsername,
        password: keyLookupPassword
      });
      setRetrievedKey(response.data.privateKey);
      alert("Key retrieved successfully! You can now copy it below.");
    } catch (error) {
      alert(error.response?.data?.message || "Error retrieving key");
      setRetrievedKey('');
    }
  };

  // CLOSE RETRIEVE KEY MODAL
  const handleCloseRetrieveKeyModal = () => {
    setShowRetrieveKeyModal(false);
    setRetrievedKey('');
    setKeyLookupUsername('');
    setKeyLookupPassword('');
  };

  // FORMAT DATE SAFELY
  const formatDate = (dateString) => {
    try {
      if (!dateString) return "Invalid Date";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleString();
    } catch (err) {
      return "Invalid Date";
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial', maxWidth: '900px', margin: 'auto' }}>
      <h1>CIT Faculty Attendance (DSA 2FA)</h1>

      {/* ROLE SELECTION SCREEN */}
      {!role ? (
        <div style={{ border: '1px solid #ccc', padding: '30px', borderRadius: '8px', textAlign: 'center' }}>
          <h2>Select Your Role</h2>
          <button 
            onClick={() => setRole('admin')} 
            style={{ padding: '15px 30px', margin: '10px', fontSize: '16px', width: '200px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}>
            Admin Panel
          </button>
          <button 
            onClick={() => setRole('faculty')} 
            style={{ padding: '15px 30px', margin: '10px', fontSize: '16px', width: '200px', cursor: 'pointer', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px' }}>
            Faculty Login
          </button>
        </div>
      ) : !user ? (

        /* LOGIN SCREEN */
        role === 'admin' ? (
          <div style={{ border: '1px solid #4CAF50', padding: '20px', borderRadius: '8px' }}>
            <h2>Admin Login</h2>
            <form onSubmit={handleAdminLogin}>
              <input 
                type="text" placeholder="Admin Username" value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ display: 'block', margin: '10px 0', padding: '8px', width: '100%', boxSizing: 'border-box' }}
              />
              <input 
                type="password" placeholder="Admin Password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ display: 'block', margin: '10px 0', padding: '8px', width: '100%', boxSizing: 'border-box' }}
              />
              <button type="submit" style={{ padding: '10px 20px', margin: '5px', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer' }}>
                Admin Login
              </button>
              <button type="button" onClick={() => { setRole(null); setUsername(''); setPassword(''); setFacultyStatus(null); setAction('Check-In'); }} style={{ padding: '10px 20px', margin: '5px' }}>
                Back
              </button>
            </form>
          </div>
        ) : (
          <div style={{ border: '1px solid #2196F3', padding: '20px', borderRadius: '8px' }}>
            <h2>Faculty Login</h2>
            <form onSubmit={handleFacultyLogin}>
              <input 
                type="text" placeholder="Username" value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ display: 'block', margin: '10px 0', padding: '8px', width: '100%', boxSizing: 'border-box' }}
              />
              <input 
                type="password" placeholder="Password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ display: 'block', margin: '10px 0', padding: '8px', width: '100%', boxSizing: 'border-box' }}
              />
              <button type="submit" style={{ padding: '10px 20px', margin: '5px', backgroundColor: '#2196F3', color: 'white', border: 'none', cursor: 'pointer' }}>
                Faculty Login
              </button>
              <button type="button" onClick={() => { setRole(null); setUsername(''); setPassword(''); setFacultyStatus(null); setAction('Check-In'); }} style={{ padding: '10px 20px', margin: '5px' }}>
                Back
              </button>
            </form>
          </div>
        )

      ) : (

        /* ADMIN DASHBOARD */
        role === 'admin' ? (
          <div style={{ border: '1px solid #4CAF50', padding: '20px', borderRadius: '8px' }}>
            <h2>Admin Dashboard</h2>
            
            {/* CREATE FACULTY ACCOUNT FORM */}
            <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
              <h3>Create Faculty Account</h3>
              <form onSubmit={handleCreateFaculty}>
                <input 
                  type="text" placeholder="Faculty Username" value={newFacultyUsername}
                  onChange={(e) => setNewFacultyUsername(e.target.value)}
                  style={{ display: 'block', margin: '10px 0', padding: '8px', width: '100%', boxSizing: 'border-box' }}
                />
                <input 
                  type="password" placeholder="Faculty Password" value={newFacultyPassword}
                  onChange={(e) => setNewFacultyPassword(e.target.value)}
                  style={{ display: 'block', margin: '10px 0', padding: '8px', width: '100%', boxSizing: 'border-box' }}
                />
                <input 
                  type="text" placeholder="Faculty Name" value={newFacultyName}
                  onChange={(e) => setNewFacultyName(e.target.value)}
                  style={{ display: 'block', margin: '10px 0', padding: '8px', width: '100%', boxSizing: 'border-box' }}
                />
                <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
                  Create Account & Generate DSA Keys
                </button>
              </form>
            </div>

            {/* DISPLAY GENERATED PRIVATE KEY */}
            {generatedPrivateKey && (
              <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '2px solid #ffc107' }}>
                <h3>🔑 Generated DSA Private Key</h3>
                <p style={{ color: '#d63031', fontWeight: 'bold' }}>⚠️ Give this key to the faculty member. Do NOT share it with anyone else!</p>
                <pre style={{ 
                  backgroundColor: '#f0f0f0', 
                  padding: '15px', 
                  borderRadius: '4px', 
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  fontFamily: 'monospace',
                  fontSize: '12px'
                }}>
                  {generatedPrivateKey}
                </pre>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPrivateKey);
                    alert("Private Key copied to clipboard!");
                  }}
                  style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px', marginRight: '10px' }}
                >
                  Copy to Clipboard
                </button>
              </div>
            )}

            {/* VIEW ALL FACULTY KEYS */}
            <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '2px solid #4CAF50' }}>
              <h3>📋 Faculty DSA Keys Management</h3>
              <button 
                onClick={handleFetchFacultyList}
                style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}
              >
                {showFacultyKeys ? '▼ Hide Faculty Keys' : '▶ View All Faculty Keys'}
              </button>

              {showFacultyKeys && (
                <div style={{ marginTop: '20px' }}>
                  {facultyList.length === 0 ? (
                    <p style={{ color: '#999' }}>No faculty accounts created yet.</p>
                  ) : (
                    <table border="1" cellPadding="10" style={{ borderCollapse: 'collapse', width: '100%', marginTop: '10px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#c8e6c9' }}>
                          <th>Faculty Name</th>
                          <th>Username</th>
                          <th>DSA Private Key</th>
                          <th>Created Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {facultyList.map((faculty) => (
                          <tr key={faculty._id}>
                            <td>{faculty.name}</td>
                            <td>{faculty.username}</td>
                            <td>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(faculty.privateKey);
                                  alert("Private Key copied to clipboard!");
                                }}
                                style={{ padding: '5px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px', fontSize: '12px' }}
                              >
                                📋 Copy Key
                              </button>
                              <details style={{ marginTop: '5px' }}>
                                <summary style={{ cursor: 'pointer', color: '#0066cc', textDecoration: 'underline' }}>View Full Key</summary>
                                <pre style={{ 
                                  backgroundColor: '#f0f0f0', 
                                  padding: '10px', 
                                  borderRadius: '4px', 
                                  overflowX: 'auto',
                                  whiteSpace: 'pre-wrap',
                                  wordWrap: 'break-word',
                                  fontFamily: 'monospace',
                                  fontSize: '10px',
                                  marginTop: '5px'
                                }}>
                                  {faculty.privateKey}
                                </pre>
                              </details>
                            </td>
                            <td>{faculty.createdAt ? new Date(faculty.createdAt).toLocaleDateString() : 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            <button type="button" onClick={() => { setUser(null); setRole(null); setFacultyStatus(null); }} style={{ padding: '10px 20px', backgroundColor: '#d63031', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
              Admin Logout
            </button>
          </div>
        ) : (

          /* FACULTY ATTENDANCE SCREEN */
          <div style={{ border: '1px solid #2196F3', padding: '20px', borderRadius: '8px' }}>
            <h2>Welcome, {user.name}</h2>
            <p style={{ fontSize: '16px', fontWeight: 'bold', color: facultyStatus === 'checked-in' ? '#28a745' : '#ffc107' }}>
              Status: {facultyStatus === 'checked-in' ? '✓ Checked In' : '✗ Checked Out'}
            </p>
            <p>Please provide your secret DSA Private Key to authenticate your attendance.</p>
            
            <form onSubmit={handleAttendance}>
              <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#e7f3ff', borderRadius: '4px', border: '1px solid #2196F3' }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>Next Action:</p>
                <input 
                  type="text" 
                  value={action}
                  disabled
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', backgroundColor: '#f0f0f0', color: '#333', fontWeight: 'bold', cursor: 'not-allowed' }}
                />
              </div>

              <textarea 
                placeholder="Paste your DSA Private Key here..."
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                style={{ width: '100%', height: '120px', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }}
              />

              <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#2196F3', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px', marginRight: '10px', fontWeight: 'bold' }}>
                Digitally Sign & {action}
              </button>
              <button type="button" onClick={() => setShowRetrieveKeyModal(true)} style={{ padding: '10px 20px', backgroundColor: '#ff9800', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px', marginRight: '10px', fontWeight: 'bold' }}>
                🔑 Forgot Your Key?
              </button>
              <button type="button" onClick={() => { setUser(null); setRole(null); setFacultyStatus(null); }} style={{ padding: '10px 20px', backgroundColor: '#d63031', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
                Logout
              </button>
            </form>
          </div>
        )
      )}

      {/* RETRIEVE KEY MODAL */}
      {showRetrieveKeyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            border: '2px solid #ff9800',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h2>🔑 Retrieve Your DSA Private Key</h2>
            <p>Enter your username and password to retrieve your private key.</p>

            {!retrievedKey ? (
              <form onSubmit={handleRetrieveKey}>
                <input 
                  type="text" 
                  placeholder="Your Username" 
                  value={keyLookupUsername}
                  onChange={(e) => setKeyLookupUsername(e.target.value)}
                  style={{ display: 'block', margin: '10px 0', padding: '8px', width: '100%', boxSizing: 'border-box' }}
                />
                <input 
                  type="password" 
                  placeholder="Your Password" 
                  value={keyLookupPassword}
                  onChange={(e) => setKeyLookupPassword(e.target.value)}
                  style={{ display: 'block', margin: '10px 0', padding: '8px', width: '100%', boxSizing: 'border-box' }}
                />
                <button 
                  type="submit" 
                  style={{ padding: '10px 20px', backgroundColor: '#ff9800', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px', marginRight: '10px', fontWeight: 'bold' }}>
                  Retrieve Key
                </button>
                <button 
                  type="button" 
                  onClick={handleCloseRetrieveKeyModal}
                  style={{ padding: '10px 20px', backgroundColor: '#ccc', color: '#333', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
                  Cancel
                </button>
              </form>
            ) : (
              <div style={{ marginTop: '20px' }}>
                <h3 style={{ color: '#28a745' }}>✓ Key Retrieved Successfully!</h3>
                <p style={{ color: '#d63031', fontWeight: 'bold' }}>Keep this key safe and do NOT share it with anyone!</p>
                <pre style={{ 
                  backgroundColor: '#f0f0f0', 
                  padding: '15px', 
                  borderRadius: '4px', 
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {retrievedKey}
                </pre>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(retrievedKey);
                    alert("Private Key copied to clipboard!");
                  }}
                  style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px', marginRight: '10px' }}
                >
                  📋 Copy to Clipboard
                </button>
                <button 
                  onClick={handleCloseRetrieveKeyModal}
                  style={{ padding: '8px 16px', backgroundColor: '#ccc', color: '#333', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ATTENDANCE LOGS */}
      <h2 style={{ marginTop: '40px' }}>Attendance Logs</h2>
      {user && role === 'admin' && (<button 
        onClick={handleClearLogs} 
        style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px', marginBottom: '20px', float: 'right' }}>
        🗑️ Clear All Logs
      </button>
      )}
      <div style={{ clear: 'both' }}></div>

      <table border="1" cellPadding="10" style={{ borderCollapse: 'collapse', width: '100%', marginTop: '10px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            <th>Faculty Name</th>
            <th>Action</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr>
              <td colSpan="4" style={{ textAlign: 'center', color: '#999' }}>No attendance records found</td>
            </tr>
          ) : (
            records.map((record) => (
              <tr key={record._id}>
                <td>{record.facultyName}</td>
                <td style={{ color: record.action === 'Check-In' ? 'blue' : 'orange', fontWeight: 'bold' }}>{record.action}</td>
                <td>{formatDate(record.timestamp)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;