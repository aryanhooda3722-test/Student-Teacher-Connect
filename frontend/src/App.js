import React, { useState, useEffect, createContext, useContext } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Context for authentication
const AuthContext = createContext();

// Custom hook to use auth context
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const value = {
    user,
    token,
    login,
    logout,
    loading,
    setUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Login Component
const Login = ({ onToggle }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API}/auth/login`, formData);
      login(response.data.user, response.data.access_token);
    } catch (error) {
      setError(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <button
              onClick={onToggle}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// Register Component
const Register = ({ onToggle }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API}/auth/register`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role
      });
      login(response.data.user, response.data.access_token);
    } catch (error) {
      setError(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-600">Join our learning platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              I am a:
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="role"
                  value="student"
                  checked={formData.role === 'student'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Student</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="role"
                  value="teacher"
                  checked={formData.role === 'teacher'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Teacher</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Create a password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Confirm your password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <button
              onClick={onToggle}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// Profile Component
const Profile = () => {
  const { user, token, setUser, logout } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    theme_preference: user?.theme_preference || 'light',
    profile_photo: user?.profile_photo || ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await axios.put(`${API}/users/me`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
      setMessage('Profile updated successfully!');
    } catch (error) {
      setMessage('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Logout
        </button>
      </div>

      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-blue-700">
              {user?.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{user?.name}</h3>
            <p className="text-gray-600">{user?.email}</p>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
              user?.role === 'teacher' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {user?.role?.charAt(0)?.toUpperCase() + user?.role?.slice(1)}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Theme Preference
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={formData.theme_preference}
            onChange={(e) => setFormData({ ...formData, theme_preference: e.target.value })}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Profile Photo URL
          </label>
          <input
            type="url"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={formData.profile_photo}
            onChange={(e) => setFormData({ ...formData, profile_photo: e.target.value })}
            placeholder="Enter image URL"
          />
        </div>

        {message && (
          <div className={`px-4 py-3 rounded-md ${
            message.includes('successfully') 
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Updating...' : 'Update Profile'}
        </button>
      </form>
    </div>
  );
};

// Teacher Dashboard Component
const TeacherDashboard = () => {
  const { user, token } = useAuth();
  const [myAssignments, setMyAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    deadline: '',
    assigned_students: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMyAssignments();
    fetchStudents();
  }, []);

  const fetchMyAssignments = async () => {
    try {
      const response = await axios.get(`${API}/assignments/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyAssignments(response.data);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API}/users/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/assignments`, {
        ...formData,
        deadline: new Date(formData.deadline).toISOString()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFormData({ title: '', description: '', subject: '', deadline: '', assigned_students: [] });
      setShowCreateForm(false);
      fetchMyAssignments();
    } catch (error) {
      console.error('Failed to create assignment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelection = (studentId) => {
    setFormData(prev => ({
      ...prev,
      assigned_students: prev.assigned_students.includes(studentId)
        ? prev.assigned_students.filter(id => id !== studentId)
        : [...prev.assigned_students, studentId]
    }));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Assignments</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {showCreateForm ? 'Cancel' : 'Create Assignment'}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Assignment</h3>
          <form onSubmit={handleCreateAssignment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                required
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Deadline</label>
              <input
                type="datetime-local"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Students</label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2">
                {students.length === 0 ? (
                  <p className="text-gray-500 text-sm">No students available</p>
                ) : (
                  students.map((student) => (
                    <label key={student.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.assigned_students.includes(student.id)}
                        onChange={() => handleStudentSelection(student.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{student.name} ({student.email})</span>
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Selected: {formData.assigned_students.length} student(s)
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating...' : 'Create Assignment'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">My Created Assignments</h3>
        </div>
        <div className="p-6">
          {myAssignments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No assignments created yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myAssignments.map((assignment) => (
                <div key={assignment.id} className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                        📚 {assignment.subject}
                      </span>
                      <span className="text-xs text-gray-500">
                        Created {new Date(assignment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-3 leading-tight">{assignment.title}</h4>
                    <p className="text-gray-600 text-sm mb-4 leading-relaxed">{assignment.description}</p>
                  </div>
                  <div className="border-t border-blue-100 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700">Due Date:</span>
                        <span className="text-sm font-bold text-red-600">
                          {new Date(assignment.deadline).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Assigned to {assignment.assigned_students?.length || 0} student(s)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Student Dashboard Component
const StudentDashboard = () => {
  const { user, token } = useAuth();
  const [myAssignments, setMyAssignments] = useState([]);
  const [completedAssignments, setCompletedAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMyAssignments();
    fetchCompletedAssignments();
  }, []);

  const fetchMyAssignments = async () => {
    try {
      const response = await axios.get(`${API}/assignments/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyAssignments(response.data);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    }
  };

  const fetchCompletedAssignments = async () => {
    try {
      const response = await axios.get(`${API}/submissions/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompletedAssignments(response.data.completed_assignments);
    } catch (error) {
      console.error('Failed to fetch completed assignments:', error);
    }
  };

  const handleCompleteAssignment = async (assignmentId) => {
    setLoading(true);
    try {
      await axios.post(`${API}/assignments/${assignmentId}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCompletedAssignments();
    } catch (error) {
      console.error('Failed to complete assignment:', error);
      alert('Failed to complete assignment. You might not be assigned to this assignment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">My Assignments</h2>

      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Assignments Assigned to Me</h3>
        </div>
        <div className="p-6">
          {myAssignments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No assignments assigned to you yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myAssignments.map((assignment) => {
                const isCompleted = completedAssignments.includes(assignment.id);
                const isOverdue = new Date(assignment.deadline) < new Date();
                
                return (
                  <div 
                    key={assignment.id} 
                    className={`relative bg-gradient-to-br rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-200 border-2 ${
                      isCompleted 
                        ? 'from-green-50 to-green-100 border-green-200' 
                        : isOverdue 
                        ? 'from-red-50 to-red-100 border-red-200' 
                        : 'from-white to-indigo-50 border-indigo-100'
                    }`}
                  >
                    {/* Completion Checkbox */}
                    <div className="absolute top-4 right-4">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          onChange={() => !isCompleted && handleCompleteAssignment(assignment.id)}
                          disabled={loading || isCompleted}
                          className="h-5 w-5 text-green-600 border-2 border-gray-300 rounded focus:ring-green-500 focus:ring-2 disabled:opacity-50"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700">
                          {isCompleted ? 'Complete' : 'Mark Done'}
                        </span>
                      </label>
                    </div>

                    {/* Status Badges */}
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                          assignment.subject === 'Mathematics' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          assignment.subject === 'Science' ? 'bg-green-100 text-green-800 border border-green-200' :
                          assignment.subject === 'English' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          assignment.subject === 'History' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                          assignment.subject === 'Art' ? 'bg-pink-100 text-pink-800 border border-pink-200' :
                          'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {assignment.subject === 'Mathematics' && '🔢'} 
                          {assignment.subject === 'Science' && '🔬'} 
                          {assignment.subject === 'English' && '📖'} 
                          {assignment.subject === 'History' && '🏛️'} 
                          {assignment.subject === 'Art' && '🎨'} 
                          {!['Mathematics', 'Science', 'English', 'History', 'Art'].includes(assignment.subject) && '📚'} 
                          {assignment.subject}
                        </span>
                        {isCompleted && (
                          <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full border border-green-200">
                            ✅ Completed
                          </span>
                        )}
                        {isOverdue && !isCompleted && (
                          <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full border border-red-200">
                            ⏰ Overdue
                          </span>
                        )}
                      </div>
                      
                      {/* Assignment Title */}
                      <h4 className="text-xl font-bold text-gray-900 mb-3 leading-tight pr-20">{assignment.title}</h4>
                      
                      {/* Description */}
                      <p className="text-gray-600 text-sm mb-4 leading-relaxed">{assignment.description}</p>
                    </div>

                    {/* Footer Information */}
                    <div className="border-t border-gray-200 pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-700">Due Date:</span>
                          <span className={`text-sm font-bold ${isOverdue && !isCompleted ? 'text-red-600' : 'text-indigo-600'}`}>
                            {new Date(assignment.deadline).toLocaleDateString('en-US', { 
                              weekday: 'short',
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-500">👨‍🏫</span>
                            <span className="text-xs text-gray-600 font-medium">{assignment.teacher_name}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Time Information */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Assigned: {new Date(assignment.created_at).toLocaleDateString()}</span>
                        {isCompleted && (
                          <span className="text-green-600 font-medium">✓ Task completed</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// All Assignments Component
const AllAssignments = () => {
  const { user, token } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [completedAssignments, setCompletedAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAllAssignments();
    if (user.role === 'student') {
      fetchCompletedAssignments();
    }
  }, []);

  const fetchAllAssignments = async () => {
    try {
      const response = await axios.get(`${API}/assignments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssignments(response.data);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    }
  };

  const fetchCompletedAssignments = async () => {
    try {
      const response = await axios.get(`${API}/submissions/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompletedAssignments(response.data.completed_assignments);
    } catch (error) {
      console.error('Failed to fetch completed assignments:', error);
    }
  };

  const handleCompleteAssignment = async (assignmentId) => {
    setLoading(true);
    try {
      await axios.post(`${API}/assignments/${assignmentId}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCompletedAssignments();
    } catch (error) {
      console.error('Failed to complete assignment:', error);
      alert('Failed to complete assignment. You might not be assigned to this assignment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">All Assignments</h2>

      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            All Assignments from Teachers
            {user.role === 'student' && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                (You can only complete assignments assigned to you)
              </span>
            )}
          </h3>
        </div>
        <div className="p-6">
          {assignments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No assignments available.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignments.map((assignment) => {
                const isCompleted = completedAssignments.includes(assignment.id);
                const isOverdue = new Date(assignment.deadline) < new Date();
                const isAssignedToMe = user.role === 'student' && assignment.assigned_students?.includes(user.id);
                const canComplete = user.role === 'student' && isAssignedToMe && !isCompleted;
                
                return (
                  <div 
                    key={assignment.id} 
                    className={`relative bg-gradient-to-br rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-200 border-2 ${
                      isCompleted 
                        ? 'from-green-50 to-green-100 border-green-200' 
                        : isOverdue 
                        ? 'from-red-50 to-red-100 border-red-200' 
                        : user.role === 'student' && !isAssignedToMe
                        ? 'from-gray-50 to-gray-100 border-gray-200 opacity-75'
                        : 'from-white to-indigo-50 border-indigo-100'
                    }`}
                  >
                    {/* Completion Checkbox for Students */}
                    {user.role === 'student' && (
                      <div className="absolute top-4 right-4">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            onChange={() => canComplete && handleCompleteAssignment(assignment.id)}
                            disabled={loading || isCompleted || !isAssignedToMe}
                            className="h-5 w-5 text-green-600 border-2 border-gray-300 rounded focus:ring-green-500 focus:ring-2 disabled:opacity-50"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700">
                            {isCompleted ? 'Complete' : !isAssignedToMe ? 'Not Assigned' : 'Mark Done'}
                          </span>
                        </label>
                      </div>
                    )}

                    {/* Status Badges */}
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                          assignment.subject === 'Mathematics' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          assignment.subject === 'Science' ? 'bg-green-100 text-green-800 border border-green-200' :
                          assignment.subject === 'English' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          assignment.subject === 'History' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                          assignment.subject === 'Art' ? 'bg-pink-100 text-pink-800 border border-pink-200' :
                          'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {assignment.subject === 'Mathematics' && '🔢'} 
                          {assignment.subject === 'Science' && '🔬'} 
                          {assignment.subject === 'English' && '📖'} 
                          {assignment.subject === 'History' && '🏛️'} 
                          {assignment.subject === 'Art' && '🎨'} 
                          {!['Mathematics', 'Science', 'English', 'History', 'Art'].includes(assignment.subject) && '📚'} 
                          {assignment.subject}
                        </span>
                        
                        {user.role === 'student' && isAssignedToMe && (
                          <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full border border-blue-200">
                            📝 Assigned to You
                          </span>
                        )}
                        
                        {isCompleted && (
                          <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full border border-green-200">
                            ✅ Completed
                          </span>
                        )}
                        {isOverdue && !isCompleted && (
                          <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full border border-red-200">
                            ⏰ Overdue
                          </span>
                        )}
                      </div>
                      
                      {/* Assignment Title */}
                      <h4 className={`text-xl font-bold mb-3 leading-tight ${
                        user.role === 'student' ? 'pr-20' : ''
                      } ${user.role === 'student' && !isAssignedToMe ? 'text-gray-600' : 'text-gray-900'}`}>
                        {assignment.title}
                      </h4>
                      
                      {/* Description */}
                      <p className={`text-sm mb-4 leading-relaxed ${
                        user.role === 'student' && !isAssignedToMe ? 'text-gray-500' : 'text-gray-600'
                      }`}>
                        {assignment.description}
                      </p>
                    </div>

                    {/* Footer Information */}
                    <div className="border-t border-gray-200 pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-700">Due Date:</span>
                          <span className={`text-sm font-bold ${isOverdue && !isCompleted ? 'text-red-600' : 'text-indigo-600'}`}>
                            {new Date(assignment.deadline).toLocaleDateString('en-US', { 
                              weekday: 'short',
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-500">👨‍🏫</span>
                            <span className="text-xs text-gray-600 font-medium">{assignment.teacher_name}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Additional Information */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Created: {new Date(assignment.created_at).toLocaleDateString()}</span>
                        <span>
                          {assignment.assigned_students?.length || 0} student(s) assigned
                        </span>
                      </div>
                      
                      {isCompleted && user.role === 'student' && (
                        <div className="text-xs text-green-600 font-medium text-center">✓ Task completed by you</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Loading Component
const Loading = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

// Auth Wrapper Component
const AuthWrapper = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return isLogin ? (
      <Login onToggle={() => setIsLogin(false)} />
    ) : (
      <Register onToggle={() => setIsLogin(true)} />
    );
  }

  return <Dashboard />;
};

// Main App Component
function App() {
  return (
    <div className="App">
      <AuthProvider>
        <AuthWrapper />
      </AuthProvider>
    </div>
  );
}

export default App;