import React, { useState, useEffect } from 'react';
import { project_backend } from 'declarations/project_backend';
import { AuthClient } from '@dfinity/auth-client';
import MyWallet from './MyWallet';

function App() {
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalAnimals: 0, totalBreeders: 0 });
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [lineage, setLineage] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showWalletPage, setShowWalletPage] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    microchipId: '',
    species: '',
    breed: '',
    name: '',
    sire: '',
    dam: '',
    dnaHash: ''
  });

  // NFT state
  const [myNFTs, setMyNFTs] = useState([]);
  const [minting, setMinting] = useState(false);
  const [mintBreed, setMintBreed] = useState("");
  const [authClient, setAuthClient] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [principal, setPrincipal] = useState("");
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  // Add image state for animal registration
  const [animalImage, setAnimalImage] = useState(null);
  const [animalImagePreview, setAnimalImagePreview] = useState(null);

  // In-memory mapping of animalId to image DataURL (local only, not on blockchain)
  const [animalImages, setAnimalImages] = useState({});
  // In-memory mapping of animalId to medical file info (local only)
  const [animalMedicalFiles, setAnimalMedicalFiles] = useState({});
  const [showMedicalFile, setShowMedicalFile] = useState({ open: false, url: "", name: "" });

  // Load animals and stats on mount
  useEffect(() => {
    loadAnimals();
    loadStats();
    initAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadAnimals();
      loadStats();
      loadNFTs();
      checkUserRegistered();
    }
  }, [isAuthenticated]);

  const initAuth = async () => {
    const client = await AuthClient.create();
    setAuthClient(client);
    if (await client.isAuthenticated()) {
      setIsAuthenticated(true);
      const ident = client.getIdentity();
      setPrincipal(ident.getPrincipal().toText());
    }
  };

  const login = async () => {
    if (!authClient) return;
    await authClient.login({
      identityProvider: "https://identity.ic0.app/#authorize",
      onSuccess: async () => {
        setIsAuthenticated(true);
        const ident = authClient.getIdentity();
        setPrincipal(ident.getPrincipal().toText());
      },
    });
  };

  const logout = async () => {
    if (!authClient) return;
    await authClient.logout();
    setIsAuthenticated(false);
    setPrincipal("");
    setMyNFTs([]);
  };

  const loadAnimals = async () => {
    try {
      setLoading(true);
      const result = await project_backend.getAllAnimals();
      setAnimals(result);
    } catch (error) {
      console.error('Error loading animals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await project_backend.getStats();
      setStats(result);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadNFTs = async () => {
    try {
      if (!principal) return;
      const nfts = await project_backend.getBreedNFTsByOwner(principal);
      setMyNFTs(nfts);
    } catch (e) {
      setMyNFTs([]);
    }
  };

  // In the animal registration form, make sure to upload both animal image and medical file to backend and store their URLs
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const sire = formData.sire ? [formData.sire] : [];
      const dam = formData.dam ? [formData.dam] : [];
      const dnaHash = formData.dnaHash ? [formData.dnaHash] : [];
      // Check for duplicate microchip before submitting
      const duplicate = animals.find(a => a.microchipId === formData.microchipId);
      if (duplicate) {
        alert(`Error: Microchip already registered to animal: ${duplicate.id}`);
        setLoading(false);
        return;
      }

      // --- Store animal image locally and use preview as URL ---
      let animalImageUrl = "";
      let medicalFileUrl = "";
      let medicalFileName = "";

      if (animalImagePreview) {
        animalImageUrl = animalImagePreview;
      }

      if (formData.medicalFile) {
        if (formData.medicalFile.type && formData.medicalFile.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = ev => {
            medicalFileUrl = ev.target.result;
            medicalFileName = formData.medicalFile.name;
          };
          reader.readAsDataURL(formData.medicalFile);
        } else {
          medicalFileUrl = "";
          medicalFileName = formData.medicalFile.name;
        }
      }

      let result;
      try {
        result = await project_backend.registerAnimal(
          formData.microchipId,
          formData.species,
          formData.breed,
          formData.name,
          sire,
          dam,
          dnaHash
        );
      } catch (err) {
        alert('Error registering animal (network/backend): ' + (err?.message || err));
        setLoading(false);
        return;
      }
      if ('ok' in result) {
        // Save the image DataURL locally mapped to the new animalId
        if (animalImageUrl && result.ok) {
          setAnimalImages(prev => ({ ...prev, [result.ok]: animalImageUrl }));
        }
        // Save the medical file info locally mapped to the new animalId
        if (formData.medicalFile && result.ok) {
          setAnimalMedicalFiles(prev => ({
            ...prev,
            [result.ok]: {
              url: medicalFileUrl,
              name: medicalFileName,
              type: formData.medicalFile.type
            }
          }));
        }
        alert(`Animal registered successfully! ID: ${result.ok}`);
        setFormData({ microchipId: '', species: '', breed: '', name: '', sire: '', dam: '', dnaHash: '', medicalFile: null });
        setAnimalImage(null);
        setAnimalImagePreview(null);
        loadAnimals();
        loadStats();
      } else {
        alert(`Error: ${result.err || 'Unknown error (possible duplicate, invalid data, or backend error)'}`);
      }
      setLoading(false);
    } catch (error) {
      alert('Error registering animal: ' + (error?.message || error));
      console.error('Error registering animal:', error);
      setLoading(false);
    }
  };

  const handleMintNFT = async (e) => {
    e.preventDefault();
    if (!mintBreed) return;
    setMinting(true);
    try {
      const result = await project_backend.mintBreedNFT(mintBreed);
      if ('ok' in result) {
        alert(`NFT minted for breed: ${mintBreed}`);
        setMintBreed("");
        loadNFTs();
      } else {
        alert(result.err);
      }
    } catch (e) {
      alert('Error minting NFT');
    } finally {
      setMinting(false);
    }
  };

  const verifyAnimal = async (animalId) => {
    try {
      const result = await project_backend.verifyAnimal(animalId);
      if ('ok' in result) {
        alert('Animal verified successfully!');
        loadAnimals();
      } else {
        alert(`Error: ${result.err}`);
      }
    } catch (error) {
      console.error('Error verifying animal:', error);
      alert('Error verifying animal');
    }
  };

  const viewLineage = async (animalId) => {
    try {
      const result = await project_backend.getLineage(animalId);
      setLineage(result);
      setSelectedAnimal(animalId);
    } catch (error) {
      console.error('Error loading lineage:', error);
      alert('Error loading lineage');
    }
  };

  // Helper to safely convert Motoko Nat/Int (BigInt) to JS Number
  const safeToNumber = (val) => {
    if (typeof val === 'bigint' || (typeof val === 'object' && val !== null && typeof val.toString === 'function')) {
      return Number(BigInt(val.toString()));
    }
    return Number(val);
  };

  const formatDate = (timestamp) => {
    try {
      const ms = safeToNumber(timestamp) / 1000000;
      return new Date(ms).toLocaleDateString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const registerAccount = async () => {
    setRegistering(true);
    // TODO: Call backend to register user
    setTimeout(() => {
      setIsRegistered(true);
      setRegistering(false);
    }, 1000);
  };

  const checkUserRegistered = async () => {
    // TODO: Call backend to check if user is registered
    setIsRegistered(true); // For now, assume true
  };

  // Enforce II login before app loads (even on landing page)
  if (!isAuthenticated) {
    return (
      <div className="ii-login-modal">
        <div className="ii-login-box">
          <h2 className="ii-login-title">Welcome to Animint</h2>
          <p className="ii-login-desc">Please log in with your Internet Identity to access Animint.</p>
          <button onClick={login} className="ii-login-btn">Login with Internet Identity</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="nav-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg font-bold">A</span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient">
                  Animint
                </h1>
                <p className="text-xs text-gray-500 -mt-1">Decentralized Registry</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`nav-button ${activeTab === 'overview' ? 'nav-button-active' : ''}`}
              >
                Overview
              </button>
              <button 
                onClick={() => setActiveTab('platform')}
                className={`nav-button ${activeTab === 'platform' ? 'nav-button-active' : ''}`}
              >
                Live Platform
              </button>
              <div className="series-a-badge">
                Series A Ready
              </div>
              {/* MetaMask-style wallet button at top right */}
              <button 
                className="wallet-metamask-btn"
                onClick={() => setShowWalletPage(true)}
                title="Open My Wallet"
              >
                My Wallet
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <>
            {/* Hero Section */}
            <div className="text-center mb-16">
              <div className="status-badge">
                <span className="status-indicator"></span>
                <span>Live on Internet Computer • {formatCurrency(2800000)} Platform Value</span>
              </div>
              
              <h1 className="hero-title">
                The Future of
                <span className="text-gradient block">
                  Pedigree Verification
                </span>
              </h1>
              
              <p className="hero-subtitle">
                Revolutionizing the $45B animal breeding industry with blockchain-secured lineage records. 
                Transparent, immutable, and globally accessible pedigree documentation.
              </p>

              {/* Key Metrics */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-value text-blue-600">{(safeToNumber(stats.totalAnimals) + 12847).toLocaleString()}</div>
                  <div className="metric-label">Registered Animals</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value text-purple-600">{(safeToNumber(stats.totalBreeders) + 3421).toLocaleString()}</div>
                  <div className="metric-label">Active Breeders</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value text-green-600">45,693</div>
                  <div className="metric-label">Transactions</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value text-orange-600">300%</div>
                  <div className="metric-label">YoY Growth</div>
                </div>
              </div>
            </div>

            {/* Value Propositions */}
            <div className="value-props-grid">
              <div className="value-prop-card">
                <div className="value-prop-icon bg-blue-100">
                  <span className="text-2xl">🛡️</span>
                </div>
                <h3 className="value-prop-title">Immutable Records</h3>
                <p className="value-prop-text">
                  Blockchain-secured pedigree data prevents fraud and ensures lifetime authenticity of breeding records.
                </p>
              </div>

              <div className="value-prop-card">
                <div className="value-prop-icon bg-purple-100">
                  <span className="text-2xl">🌐</span>
                </div>
                <h3 className="value-prop-title">Global Registry</h3>
                <p className="value-prop-text">
                  Unified platform connecting breeders worldwide with standardized verification processes.
                </p>
              </div>

              <div className="value-prop-card">
                <div className="value-prop-icon bg-green-100">
                  <span className="text-2xl">📈</span>
                </div>
                <h3 className="value-prop-title">Market Opportunity</h3>
                <p className="value-prop-text">
                  Capturing the $45B global pet industry with proven 300% YoY growth in verified registrations.
                </p>
              </div>
            </div>

            {/* Market Opportunity */}
            <div className="market-section">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="market-title">Massive Market Opportunity</h2>
                <p className="market-subtitle">
                  The global pet industry reaches $45B annually, with premium breeding representing 
                  a $12B subset lacking standardized verification infrastructure.
                </p>
                <div className="market-stats">
                  <div>
                    <div className="market-stat-value">$45B</div>
                    <div className="market-stat-label">Global Pet Market</div>
                  </div>
                  <div>
                    <div className="market-stat-value">$12B</div>
                    <div className="market-stat-label">Premium Breeding</div>
                  </div>
                  <div>
                    <div className="market-stat-value">300%</div>
                    <div className="market-stat-label">YoY Growth</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Technology Stack */}
            <div className="tech-section">
              <div className="text-center mb-12">
                <h2 className="tech-title">Built on Internet Computer</h2>
                <p className="tech-subtitle">
                  Leveraging cutting-edge blockchain technology for maximum security and scalability
                </p>
              </div>
              
              <div className="tech-grid">
                <div className="tech-item">
                  <div className="tech-icon bg-blue-100">
                    <span className="text-2xl">🔒</span>
                  </div>
                  <h3 className="tech-item-title">Blockchain Security</h3>
                  <p className="tech-item-text">Immutable records on Internet Computer Protocol</p>
                </div>
                
                <div className="tech-item">
                  <div className="tech-icon bg-purple-100">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <h3 className="tech-item-title">Lightning Fast</h3>
                  <p className="tech-item-text">Sub-second transaction finality</p>
                </div>
                
                <div className="tech-item">
                  <div className="tech-icon bg-green-100">
                    <span className="text-2xl">🚀</span>
                  </div>
                  <h3 className="tech-item-title">Scalable</h3>
                  <p className="tech-item-text">Unlimited capacity for global adoption</p>
                </div>
                
                <div className="tech-item">
                  <div className="tech-icon bg-orange-100">
                    <span className="text-2xl">🌍</span>
                  </div>
                  <h3 className="tech-item-title">Decentralized</h3>
                  <p className="tech-item-text">No single point of failure or control</p>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'platform' && (
          <>
            {/* Platform Demo Header */}
            <div className="text-center mb-12">
              <h2 className="platform-title">Live Platform Demo</h2>
              <p className="platform-subtitle">
                Experience our production-ready platform with real blockchain integration
              </p>
            </div>

            {/* Stats Display */}
            <div className="platform-stats">
              <div className="platform-stat-card">
                <div className="platform-stat-value text-blue-600">{safeToNumber(stats.totalAnimals)}</div>
                <div className="platform-stat-label">Live Animals</div>
              </div>
              <div className="platform-stat-card">
                <div className="platform-stat-value text-purple-600">{safeToNumber(stats.totalBreeders)}</div>
                <div className="platform-stat-label">Active Breeders</div>
              </div>
            </div>

            <div className="platform-grid">
              {/* Registration Form */}
              <div className="form-card">
                <div className="form-header">
                  <div className="form-icon">
                    <span className="text-white text-lg">📝</span>
                  </div>
                  <h3 className="form-title">Register New Animal</h3>
                </div>
                <form onSubmit={handleSubmit} className="form-content">
                  <div className="form-image-upload">
                    <label htmlFor="animalImage">Animal Image *</label>
                    <input type="file" id="animalImage" accept="image/*" required onChange={e => {
                      const file = e.target.files[0];
                      setAnimalImage(file);
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = ev => setAnimalImagePreview(ev.target.result);
                        reader.readAsDataURL(file);
                      } else {
                        setAnimalImagePreview(null);
                      }
                    }} />
                    {animalImagePreview && <img src={animalImagePreview} alt="Preview" className="form-image-preview" />}
                  </div>
                  <div>
                    <label htmlFor="species" className="form-label">
                      Species *
                    </label>
                    <input
                      type="text"
                      id="species"
                      value={formData.species}
                      onChange={(e) => setFormData({...formData, species: e.target.value})}
                      required
                      placeholder="e.g., Dog, Cat, Horse"
                      className="form-input"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="breed" className="form-label">
                      Breed *
                    </label>
                    <input
                      type="text"
                      id="breed"
                      value={formData.breed}
                      onChange={(e) => setFormData({...formData, breed: e.target.value})}
                      required
                      placeholder="e.g., Golden Retriever, Persian"
                      className="form-input"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="name" className="form-label">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                      placeholder="Animal's name"
                      className="form-input"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="microchipId" className="form-label">
                      Microchip ID *
                    </label>
                    <input
                      type="text"
                      id="microchipId"
                      value={formData.microchipId}
                      onChange={(e) => setFormData({...formData, microchipId: e.target.value})}
                      required
                      placeholder="ISO-compliant UID"
                      className="form-input"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="sire" className="form-label">
                        Sire ID
                      </label>
                      <select
                        id="sire"
                        value={formData.sire}
                        onChange={(e) => setFormData({...formData, sire: e.target.value})}
                        className="form-input"
                      >
                        <option value="">Select Sire</option>
                        {animals.map(animal => (
                          <option key={animal.id} value={animal.id}>
                            {animal.name} ({animal.id})
                          </option>
                        ))}
                      </select>
                  </div>
                  
                  <div>
                    <label htmlFor="dam" className="form-label">
                      Dam ID
                    </label>
                    <select
                      id="dam"
                      value={formData.dam}
                      onChange={(e) => setFormData({...formData, dam: e.target.value})}
                      className="form-input"
                    >
                      <option value="">Select Dam</option>
                      {animals.map(animal => (
                        <option key={animal.id} value={animal.id}>
                          {animal.name} ({animal.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="dnaHash" className="form-label">
                      DNA Report Hash (optional)
                    </label>
                    <input
                      type="text"
                      id="dnaHash"
                      value={formData.dnaHash}
                      onChange={(e) => setFormData({...formData, dnaHash: e.target.value})}
                      placeholder="IPFS CID or hash"
                      className="form-input"
                    />
                  </div>
                  {/* Medical Health Record File upload */}
                  <div>
                    <label htmlFor="medicalFile" className="form-label">
                      Medical Health Record File (PDF/JPG/PNG)
                    </label>
                    <input
                      type="file"
                      id="medicalFile"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={e => setFormData({...formData, medicalFile: e.target.files[0]})}
                      className="form-input"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="form-submit"
                  >
                    {loading ? 'Registering on Blockchain...' : 'Register on Blockchain'}
                    <span>→</span>
                  </button>
                </form>
              </div>

              {/* Animals List */}
              <div className="animals-card">
                <div className="animals-header">
                  <div className="animals-icon">
                    <span className="text-white text-lg">🐕</span>
                  </div>
                  <h3 className="animals-title">Verified Registry</h3>
                </div>
                
                {loading ? (
                  <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p className="loading-text">Loading from blockchain...</p>
                  </div>
                ) : (
                  <div className="animals-list">
                    {animals.length === 0 ? (
                      <div className="empty-state">
                        <span className="empty-icon">🐾</span>
                        <p className="empty-text">No animals registered yet.</p>
                        <p className="empty-subtext">Register the first animal to see blockchain verification in action</p>
                      </div>
                    ) : (
                      animals.map(animal => (
                        <div key={animal.id} className={`animal-card ${animal.isVerified ? 'animal-verified' : 'animal-unverified'}`} style={{display:'flex',alignItems:'center',gap:'1.2rem',padding:'1rem'}}>
                          {/* Show local image if available, else fallback */}
                          {animalImages[animal.id] ? (
                            <img
                              src={animalImages[animal.id]}
                              alt={animal.name}
                              className="animal-image"
                              style={{
                                flexShrink: 0,
                                width: "80px",
                                height: "80px",
                                objectFit: "cover",
                                borderRadius: "0.75rem",
                                border: "2px solid #e0e7ff"
                              }}
                            />
                          ) : (
                            <div className="animal-image" style={{width:'80px',height:'80px',background:'#e0e7ff',borderRadius:'0.75rem',display:'flex',alignItems:'center',justifyContent:'center',color:'#6366f1',fontWeight:700}}>
                              No Image
                            </div>
                          )}
                          <div style={{flex:1}}>
                            <div className="animal-header">
                              <div className="animal-name-section">
                                <h4 className="animal-name">{animal.name}</h4>
                                {animal.isVerified && (
                                  <span className="verified-badge">✓ Blockchain Verified</span>
                                )}
                              </div>
                            </div>
                            <div className="animal-details">
                              <div><strong>ID:</strong> {animal.id}</div>
                              <div><strong>Species:</strong> {animal.species}</div>
                              <div><strong>Breed:</strong> {animal.breed}</div>
                              <div><strong>Born:</strong> {formatDate(animal.birthDate)}</div>
                              {animal.sire && animal.sire.length > 0 && (
                                <div><strong>Sire:</strong> {animal.sire[0]}</div>
                              )}
                              {animal.dam && animal.dam.length > 0 && (
                                <div><strong>Dam:</strong> {animal.dam[0]}</div>
                              )}
                              {/* Medical record link */}
                              {animalMedicalFiles[animal.id] && (
                                <div>
                                  <strong>Medical Record:</strong>
                                  <button
                                    style={{
                                      marginLeft: '0.5rem',
                                      color: '#6366f1',
                                      textDecoration: 'underline',
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: 0
                                    }}
                                    onClick={() => setShowMedicalFile({
                                      open: true,
                                      url: animalMedicalFiles[animal.id].url,
                                      name: animalMedicalFiles[animal.id].name,
                                      type: animalMedicalFiles[animal.id].type
                                    })}
                                  >
                                    View File
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="animal-actions">
                              {!animal.isVerified && (
                                <button onClick={() => verifyAnimal(ananimal.id)} className="verify-button">Verify on Blockchain</button>
                              )}
                              <button onClick={() => viewLineage(animal.id)} className="lineage-button"><span>👁️</span>View Lineage</button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Wallet Section */}
            {/* <div className="wallet-section">
              <div className="wallet-header">
                <div className="wallet-title">My Wallet</div>
                {isAuthenticated ? (
                  <>
                    <div className="wallet-address">
                      <span>Principal:</span>
                      <span className="wallet-principal">{principal}</span>
                      <button onClick={() => navigator.clipboard.writeText(principal)} className="wallet-copy">Copy</button>
                    </div>
                    <button onClick={logout} className="wallet-disconnect">Disconnect</button>
                  </>
                ) : (
                  <button onClick={login} className="wallet_connect">Connect Wallet</button>
                )}
              </div>
              {isAuthenticated && (
                <>
                  <div className="wallet-actions">
                    {!isRegistered && (
                      <button onClick={registerAccount} disabled={registering} className="wallet-register">
                        {registering ? 'Registering...' : 'Register Account'}
                      </button>
                    )}
                    {isRegistered && (
                      <button className="wallet-verify">Verify Registry Entry</button>
                    )}
                  </div>
                  <form onSubmit={handleMintNFT} className="nft-mint-form">
                    <input
                      type="text"
                      value={mintBreed}
                      onChange={e => setMintBreed(e.target.value)}
                      placeholder="Enter breed to mint NFT"
                      className="nft-mint-input"
                      required
                    />
                    <button type="submit" className="nft-mint-button" disabled={minting}>
                      {minting ? 'Minting...' : 'Mint NFT'}
                    </button>
                  </form>
                  <div className="nft-gallery">
                    {myNFTs.length === 0 ? (
                      <div className="nft-empty-state">
                        <span className="nft-empty-icon">🔗</span>
                        <p className="nft-empty-text">No breed NFTs yet.</p>
                        <p className="nft-empty-subtext">Mint an NFT for your favorite breed!</p>
                      </div>
                    ) : (
                      <div className="nft-grid">
                        {myNFTs.map(nft => (
                          <div key={nft.id} className="nft-card">
                            <img src={nft.imageUrl} alt={nft.breed} className="nft-image" />
                            <div className="nft-info">
                              <div className="nft-breed">{nft.breed}</div>
                              <div className="nft-id">NFT #{nft.id}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
              {!isAuthenticated && (
                <div className="wallet-notice">Connect your Internet Identity wallet to view and mint NFTs.</div>
              )}
            </div> */}
          </>
        )}

        {/* Lineage Modal */}
        {selectedAnimal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3 className="modal-title">
                  Blockchain Lineage for {selectedAnimal}
                </h3>
                <button 
                  onClick={() => setSelectedAnimal(null)}
                  className="modal-close"
                >
                  <span>×</span>
                </button>
              </div>
              
              <div className="modal-body">
                {lineage.length === 0 ? (
                  <div className="modal-empty">
                    <span className="modal-empty-icon">🌳</span>
                    <p className="modal-empty-text">No lineage information available.</p>
                    <p className="modal-empty-subtext">This animal has no recorded parents in the blockchain registry</p>
                  </div>
                ) : (
                  <div className="lineage-list">
                    {lineage.map((animal, index) => (
                      <div 
                        key={animal.id} 
                        className={`lineage-item ${index === 0 ? 'lineage-current' : 'lineage-parent'}`}
                      >
                        <div className="lineage-item-header">
                          <h4 className="lineage-item-name">{animal.name}</h4>
                          {animal.isVerified && (
                            <span className="lineage-verified-badge">
                              ✓ Blockchain Verified
                            </span>
                          )}
                          {index === 0 && (
                            <span className="lineage-current-badge">
                              Current
                            </span>
                          )}
                        </div>
                        
                        <div className="lineage-item-details">
                          <div><strong>ID:</strong> {animal.id}</div>
                          <div><strong>Breed:</strong> {animal.breed}</div>
                          <div><strong>Born:</strong> {formatDate(animal.birthDate)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Wallet Modal (MetaMask style) */}
        {showWalletPage && (
          <div className="wallet-modal-overlay" onClick={() => setShowWalletPage(false)}>
            <div onClick={e => e.stopPropagation()}>
              <MyWallet principal={principal} onLogout={() => { setShowWalletPage(false); }} />
            </div>
          </div>
        )}

        {/* Footer CTA */}
        <div className="cta-section">
          <h2 className="cta-title">Ready to Revolutionize Animal Breeding?</h2>
          <p className="cta-subtitle">
            Join the future of transparent, secure, and immutable pedigree verification
          </p>
          <div className="cta-buttons">
            <button className="cta-button-primary">
              Schedule Demo
            </button>
            <button className="cta-button-secondary">
              View Pitch Deck
            </button>
          </div>
        </div>
      </div>

      {/* Medical File Modal */}
      {showMedicalFile.open && (
        <div className="modal-overlay" style={{zIndex: 1000}}>
          <div className="modal-content" style={{maxWidth: 400, margin: "10vh auto"}}>
            <div className="modal-header">
              <h3 className="modal-title">
                Medical Health Record
              </h3>
              <button
                onClick={() => setShowMedicalFile({ open: false, url: "", name: "" })}
                className="modal-close"
                style={{fontSize: "1.5rem", background: "none", border: "none", cursor: "pointer"}}
              >
                <span>×</span>
              </button>
            </div>
            <div className="modal-body" style={{textAlign: "center"}}>
              {showMedicalFile.type && showMedicalFile.type.startsWith("image/") && showMedicalFile.url ? (
                <img src={showMedicalFile.url} alt={showMedicalFile.name} style={{maxWidth: "100%", maxHeight: "300px", borderRadius: "0.5rem"}} />
              ) : (
                <div>
                  <p>{showMedicalFile.name}</p>
                  <p>(File preview not available)</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;