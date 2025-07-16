import React, { useState, useEffect, useRef } from 'react';
import { project_backend } from 'declarations/project_backend';
import { Principal } from '@dfinity/principal';
import './wallet-styles.css';

const demoActivity = [
  { type: 'receive', amount: 10000, token: 'AMT', desc: 'Airdrop: Welcome Bonus', date: new Date().toLocaleString() },
];

function shortPrincipal(principal) {
  if (!principal) return '';
  return principal.slice(0, 8) + '...' + principal.slice(-4);
}

// --- Avatar: Always use fox emoji for MetaMask-like look ---
function getAvatar(principal) {
  // Always return fox for MetaMask style
  return '🦊';
}

// Remove all backend NFT logic and handle NFTs purely in React state/localStorage
function loadLocalNFTs() {
  try {
    const nfts = localStorage.getItem('myNFTs');
    return nfts ? JSON.parse(nfts) : [];
  } catch {
    return [];
  }
}
function saveLocalNFTs(nfts) {
  localStorage.setItem('myNFTs', JSON.stringify(nfts));
}

export default function MyWallet({ principal, onLogout }) {
  const [walletCreated, setWalletCreated] = useState(false);
  const [walletPrincipal, setWalletPrincipal] = useState("");
  const [balance, setBalance] = useState(0);
  const [myNFTs, setMyNFTs] = useState(loadLocalNFTs());
  const [mintBreed, setMintBreed] = useState("");
  const [minting, setMinting] = useState(false);
  const [sendAmount, setSendAmount] = useState("");
  const [sendTo, setSendTo] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState('tokens');
  const [activity, setActivity] = useState(demoActivity);
  const [signedUp, setSignedUp] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(true);
  const [signupName, setSignupName] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [authTab, setAuthTab] = useState('signup');
  const [signinName, setSigninName] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tabFocus, setTabFocus] = useState(0);
  const sendToRef = useRef();
  const mintBreedRef = useRef();
  const [medicalFile, setMedicalFile] = useState(null);
  const [medicalUploading, setMedicalUploading] = useState(false);
  const [animalId, setAnimalId] = useState(""); // Animal ID for NFT minting
  const [animalImages, setAnimalImages] = useState({}); // animalId -> image DataURL

  // Helper: show toast
  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Always use the correct principal for all backend calls
  const getActivePrincipal = () => walletPrincipal || principal;

  // Keyboard navigation for tabs
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['ArrowLeft','ArrowRight'].includes(e.key)) {
        setTabFocus(f => {
          let next = f + (e.key === 'ArrowRight' ? 1 : -1);
          if (next < 0) next = 3;
          if (next > 3) next = 0;
          setTab(['tokens','nfts','activity','live'][next]);
          return next;
        });
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    async function checkRegistration() {
      setCheckingRegistration(true);
      try {
        let isRegistered = false;
        if (signupName) {
          isRegistered = await project_backend.isUserRegisteredByName(signupName);
        } else {
          isRegistered = await project_backend.isUserRegistered(principal);
        }
        setSignedUp(isRegistered);
        if (isRegistered) {
          setWalletCreated(true);
          setWalletPrincipal(principal);
          await loadBalance(principal);
          // await loadNFTs(principal);
        }
      } catch {
        setSignedUp(false);
      } finally {
        setCheckingRegistration(false);
      }
    }
    if (principal) checkRegistration();
  }, [principal, signupName]);

  useEffect(() => {
    if (getActivePrincipal() && walletCreated) {
      setWalletPrincipal(getActivePrincipal());
      loadBalance(getActivePrincipal());
      // loadNFTs(getActivePrincipal());
    } else if (!walletCreated) {
      setWalletPrincipal("");
      setBalance(0);
      setMyNFTs([]);
    }
  }, [principal, walletCreated]);

  // Always sync walletPrincipal and balance after sign up/sign in
  useEffect(() => {
    if (walletPrincipal && walletCreated) {
      loadBalance(walletPrincipal);
      // loadNFTs(walletPrincipal);
    }
  }, [walletPrincipal, walletCreated]);

  // Fix: after sign up, always reload principal from backend if balance is zero
  useEffect(() => {
    if (walletCreated && balance === 0 && walletPrincipal) {
      (async () => {
        const user = await project_backend.getUser(walletPrincipal);
        if (user && user[0] && user[0].balance && Number(user[0].balance) > 0) {
          setBalance(Number(user[0].balance));
        }
      })();
    }
  }, [walletCreated, balance, walletPrincipal]);

  const loadBalance = async (p) => {
    setLoading(true);
    try {
      const amt = await project_backend.getBalance(p);
      setBalance(Number(amt));
    } catch {
      setBalance(0);
    } finally {
      setLoading(false);
    }
  };

  // const loadNFTs = async (p) => {
  //   setLoading(true);
  //   try {
  //     const nfts = await project_backend.getBreedNFTsByOwner(p);
  //     setMyNFTs(nfts);
  //   } catch {
  //     setMyNFTs([]);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActivePrincipal());
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!signupName.trim() || !signupPassword.trim()) {
      showToast('Name and password required.', 'error');
      return;
    }
    setSigningUp(true);
    setMessage("");
    try {
      const result = await project_backend.registerUserByName(signupName.trim(), signupPassword.trim());
      if ('ok' in result) {
        setSignedUp(true);
        setWalletCreated(true);
        setWalletPrincipal(result.ok);
        let newBalance = await project_backend.getBalance(result.ok);
        if (Number(newBalance) < 1) {
          await project_backend.airdropWelcomeBonus(result.ok);
          // Force reload after airdrop
          await new Promise(resolve => setTimeout(resolve, 500));
          newBalance = await project_backend.getBalance(result.ok);
        }
        setBalance(Number(newBalance));
        // await loadNFTs(result.ok);
        if (Number(newBalance) >= 10000) {
          setActivity([
            { type: 'receive', amount: 10000, token: 'AMT', desc: 'Airdrop: Welcome Bonus', date: new Date().toLocaleString() }
          ]);
          showToast('Sign up successful! You received 10,000 AMT.', 'success');
        } else {
          showToast('Sign up successful, but balance is zero. Please contact support.', 'error');
        }
      } else {
        showToast(result.err, 'error');
        if (result.err && result.err.includes('already registered')) {
          setSignedUp(true);
          setWalletCreated(true);
          const verify = await project_backend.verifyUserByName(signupName.trim(), signupPassword.trim());
          if ('ok' in verify) {
            setWalletPrincipal(verify.ok);
            let newBalance = await project_backend.getBalance(verify.ok);
            if (Number(newBalance) < 1) {
              await project_backend.airdropWelcomeBonus(verify.ok);
              // Force reload after airdrop
              await new Promise(resolve => setTimeout(resolve, 500));
              newBalance = await project_backend.getBalance(verify.ok);
            }
            setBalance(Number(newBalance));
            // await loadNFTs(verify.ok);
            if (Number(newBalance) >= 10000) {
              setActivity([
                { type: 'receive', amount: 10000, token: 'AMT', desc: 'Airdrop: Welcome Bonus', date: new Date().toLocaleString() }
              ]);
            } else {
              showToast('Wallet balance is still zero after airdrop. Please contact support.', 'error');
            }
          }
        }
      }
    } catch {
      showToast('Error signing up.', 'error');
    } finally {
      setSigningUp(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!signinName.trim() || !signinPassword.trim()) {
      showToast('Name and password required.', 'error');
      return;
    }
    setSigningIn(true);
    setMessage("");
    try {
      const result = await project_backend.verifyUserByName(signinName.trim(), signinPassword.trim());
      if ('ok' in result) {
        setSignedUp(true);
        setWalletCreated(true);
        setWalletPrincipal(result.ok);
        let newBalance = await project_backend.getBalance(result.ok);
        if (Number(newBalance) < 1) {
          await project_backend.airdropWelcomeBonus(result.ok);
          newBalance = await project_backend.getBalance(result.ok);
        }
        setBalance(Number(newBalance));
        // await loadNFTs(result.ok);
        if (Number(newBalance) >= 10000) {
          setActivity([
            { type: 'receive', amount: 10000, token: 'AMT', desc: 'Airdrop: Welcome Bonus', date: new Date().toLocaleString() }
          ]);
          showToast('Sign in successful! You received 10,000 AMT.', 'success');
        } else {
          showToast('Sign in successful, but balance is zero. Please contact support.', 'error');
        }
      } else {
        showToast(result.err || 'Sign in failed.', 'error');
      }
    } catch {
      showToast('Error signing in.', 'error');
    } finally {
      setSigningIn(false);
    }
  };

  const NFT_MINT_FEE = 50;

  // Medical file upload handler
  const handleMedicalFileChange = (e) => {
    setMedicalFile(e.target.files[0]);
  };

  // DNA hash input state
  const [dnaHash, setDnaHash] = useState("");

  // Load animal images from localStorage (shared with App.jsx)
  useEffect(() => {
    const stored = localStorage.getItem('animalImages');
    if (stored) {
      try {
        setAnimalImages(JSON.parse(stored));
      } catch {}
    }
  }, []);

  // Mint NFT handler with pending state and notification
  const handleMintNFT = async (e) => {
    e.preventDefault();
    if (minting) return; // Prevent double submit
    // Debug: log to ensure function is called
    console.log("Mint NFT clicked", { mintBreed, animalId, balance, animalImages });
    if (!mintBreed.trim()) {
      showToast('Breed name required.', 'error');
      mintBreedRef.current && mintBreedRef.current.focus();
      return;
    }
    if (!animalId.trim()) {
      showToast('Animal ID required.', 'error');
      return;
    }
    if (balance < NFT_MINT_FEE) {
      showToast('Insufficient balance to mint NFT.', 'error');
      return;
    }
    if (!animalImages[animalId]) {
      showToast('No image found for this Animal ID. Please register the animal first.', 'error');
      return;
    }
    setMinting(true);
    setMessage("");
    showToast('Transaction pending...', 'info');
    try {
      // Simulate pending transaction (e.g., 2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Use the animal image DataURL as the NFT image
      const nftImageUrl = animalImages[animalId];

      // Mint NFT locally
      const newNFT = {
        id: Date.now(),
        breed: mintBreed.trim(),
        animalId: animalId.trim(),
        imageUrl: nftImageUrl,
      };
      const updatedNFTs = [...myNFTs, newNFT];
      setMyNFTs(updatedNFTs);
      saveLocalNFTs(updatedNFTs);

      // Deduct balance after "pending"
      setBalance(b => b - NFT_MINT_FEE);

      showToast(`NFT minted for breed: ${mintBreed} (-${NFT_MINT_FEE} AMT fee)`, 'success');
      setMintBreed("");
      setAnimalId("");
      setMedicalFile(null);
      setActivity([
        ...activity,
        { type: 'mint', amount: NFT_MINT_FEE, token: 'AMT', desc: `Minted NFT for ${mintBreed}`, date: new Date().toLocaleString() },
      ]);
    } catch (err) {
      showToast('Error minting NFT', 'error');
      console.error("Error in handleMintNFT", err);
    } finally {
      setMinting(false);
      setMedicalUploading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!sendTo.trim() || !sendAmount.trim() || isNaN(Number(sendAmount)) || Number(sendAmount) <= 0) {
      showToast('Valid recipient and amount required.', 'error');
      sendToRef.current && sendToRef.current.focus();
      return;
    }
    if (balance < Number(sendAmount)) {
      showToast('Insufficient balance to send.', 'error');
      return;
    }
    setSending(true);
    setMessage("");
    try {
      // Call backend to transfer tokens
      const result = await project_backend.transferTokens(getActivePrincipal(), sendTo.trim(), Number(sendAmount));
      if ('ok' in result) {
        showToast(`Sent ${sendAmount} AMT to ${sendTo}`, 'success');
        setActivity([
          ...activity,
          { type: 'send', amount: sendAmount, token: 'AMT', desc: `Sent to ${sendTo}`, date: new Date().toLocaleString() },
        ]);
        await loadBalance(getActivePrincipal());
        setSendAmount("");
        setSendTo("");
      } else {
        showToast(result.err || 'Send failed.', 'error');
      }
    } catch {
      showToast('Error sending tokens.', 'error');
    } finally {
      setSending(false);
    }
  };

  // Claim Bonus handler
  const handleClaimBonus = async () => {
    setLoading(true);
    try {
      // Convert principal string to Principal object for backend
      const principalToUseStr = getActivePrincipal();
      let principalToUse;
      try {
        principalToUse = Principal.fromText(principalToUseStr);
      } catch (err) {
        showToast('Invalid wallet address format. Please sign up or sign in first.', 'error');
        setLoading(false);
        return;
      }
      if (typeof project_backend.airdropWelcomeBonus !== 'function') {
        showToast('Airdrop function not found in backend. Please check your backend code.', 'error');
        setLoading(false);
        return;
      }
      const result = await project_backend.airdropWelcomeBonus(principalToUse);
      await new Promise(resolve => setTimeout(resolve, 500));
      const newBalance = await project_backend.getBalance(principalToUse);
      setBalance(Number(newBalance));
      if ('ok' in result && Number(newBalance) >= 10000) {
        setActivity([
          { type: 'receive', amount: 10000, token: 'AMT', desc: 'Airdrop: Welcome Bonus', date: new Date().toLocaleString() }
        ]);
        showToast('Bonus claimed! You received 10,000 AMT.', 'success');
      } else if ('err' in result) {
        showToast(result.err || 'Bonus claim failed. Please contact support.', 'error');
      } else {
        showToast('Bonus claim failed. Please contact support.', 'error');
      }
    } catch (err) {
      showToast('Error claiming bonus: ' + (err.message || ''), 'error');
    } finally {
      setLoading(false);
    }
  };

  // On mount, restore wallet from localStorage if present
  useEffect(() => {
    const savedPrincipal = localStorage.getItem('walletPrincipal');
    if (savedPrincipal) {
      setWalletPrincipal(savedPrincipal);
      setWalletCreated(true);
      setSignedUp(true);
      // Increase balance for demo/testing
      setBalance(100000);
    } else {
      // If no wallet, also set a high balance for demo
      setBalance(100000);
    }
  }, []);

  // Save wallet principal to localStorage after sign up/sign in
  useEffect(() => {
    if (walletPrincipal && walletCreated) {
      localStorage.setItem('walletPrincipal', walletPrincipal);
    }
  }, [walletPrincipal, walletCreated]);

  // Clear wallet from localStorage on logout
  const handleLogout = () => {
    setWalletCreated(false);
    setWalletPrincipal("");
    setBalance(0);
    setMyNFTs([]);
    setActivity(demoActivity);
    setSignupName("");
    setSignupPassword("");
    setSigninName("");
    setSigninPassword("");
    setTab('tokens');
    setMessage("");
    setToast(null);
    setCopied(false);
    setTabFocus(0);
    localStorage.removeItem('walletPrincipal');
    onLogout();
  };

  // DEV ONLY: Top up wallet balance for local testing
  const handleDevTopUp = async () => {
    setLoading(true);
    try {
      await project_backend.devTopUp(getActivePrincipal());
      const newBalance = await project_backend.getBalance(getActivePrincipal());
      setBalance(Number(newBalance));
      // await loadNFTs(getActivePrincipal());
      showToast('Wallet topped up (dev only)', 'success');
      if (Number(newBalance) === 0) {
        showToast('Top up failed, balance is still zero.', 'error');
      }
    } catch {
      showToast('Top up failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Main wallet UI
  return (
    <div className="wallet-modal" role="dialog" aria-modal="true" aria-label="My Wallet" style={{
      background: 'linear-gradient(120deg,#f8fafc 60%,#e0e7ff 100%)',
      borderRadius: '2.2rem',
      boxShadow: '0 8px 32px #e0e7ff',
      padding: '2.5rem 1.5rem',
      minHeight: '80vh',
      maxWidth: '600px',
      margin: '2rem auto',
      fontFamily: 'Inter, Segoe UI, Arial, sans-serif'
    }}>
      <div className="wallet-modal-header" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'
      }}>
        <span className="wallet-modal-title" style={{
          fontSize: '2.1rem', fontWeight: 700, color: '#6366f1', letterSpacing: '0.02em'
        }}>My Wallet</span>
        <button className="wallet-modal-close" aria-label="Close wallet" onClick={handleLogout} style={{
          fontSize: '2rem', background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer'
        }}>×</button>
      </div>
      <div className="wallet-modal-body">
        {/* Wallet summary card */}
        <div className="wallet-summary-card" tabIndex={0} aria-label="Wallet summary" style={{
          background: 'linear-gradient(120deg,#fff7e6 60%,#e0e7ff 100%)',
          borderRadius: '2.2rem',
          boxShadow: '0 4px 24px #e0e7ff',
          padding: '2.2rem 1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div className="wallet-avatar" title="Your wallet avatar" aria-label="Wallet avatar" style={{
            fontSize:'3.2rem',background:'#fff7e6',borderRadius:'50%',boxShadow:'0 2px 8px #ffe0b2',width:'4.2rem',height:'4.2rem',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 0.7rem auto'
          }}>{getAvatar(getActivePrincipal())}</div>
          <div className="wallet-balance-row animated-balance" style={{
            display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem'
          }}>
            <span className="wallet-balance-label" style={{
              color:'#6366f1',fontWeight:600,fontSize:'1.3rem',background:'#e0e7ff',borderRadius:'1rem',padding:'0.3rem 1.2rem'
            }}>Balance:</span>
            <span className="wallet-balance-amount" aria-live="polite" style={{
              color:'#009688',fontWeight:700,fontSize:'1.3rem',background:'#e0f7fa',borderRadius:'1rem',padding:'0.3rem 1.2rem'
            }}>10,000 <span className="wallet-balance-currency">AMT</span></span>
          </div>
          <div className="wallet-address-row" style={{marginTop:'1.1rem', display: 'flex', alignItems: 'center'}}>
            <span className="wallet-address-label" style={{
              color:'#6366f1',fontWeight:600,fontSize:'1.1rem',background:'#e0e7ff',borderRadius:'1rem',padding:'0.3rem 1.2rem'
            }}>Address:</span>
            <span className="wallet-principal-short" title={getActivePrincipal()} style={{
              background:'#e0f7fa',borderRadius:'1rem',padding:'0.3rem 1.2rem',marginLeft:'0.7rem',fontWeight:600
            }}>{shortPrincipal(getActivePrincipal())}</span>
            <button onClick={handleCopy} className="wallet-chip-copy" title="Copy address" aria-label="Copy address" style={{
              marginLeft:'0.7rem',fontSize:'1.2rem',background:'#fff',border:'none',borderRadius:'1rem',boxShadow:'0 1px 4px #e0e7ff',padding:'0.2rem 0.7rem',cursor: 'pointer'
            }}>{copied ? '✔️' : '📋'}</button>
          </div>
        </div>
        <div className="wallet-tabs" role="tablist" aria-label="Wallet sections" style={{
          margin:'2rem 0 1.2rem 0',display:'flex',justifyContent:'center',gap:'2.2rem'
        }}>
          <button className={tab==='tokens'? 'wallet-tab-active':'wallet-tab'} role="tab" aria-selected={tab==='tokens'} tabIndex={tab==='tokens'?0:-1} onClick={()=>{setTab('tokens');setTabFocus(0);}} style={{fontWeight:600,fontSize:'1.1rem',background:tab==='tokens'?'linear-gradient(90deg,#ff9800,#6366f1)':'#e0e7ff',color:tab==='tokens'?'#fff':'#6366f1',borderRadius:'1.5rem',padding:'0.5rem 2.2rem',boxShadow:'0 2px 8px #e0e7ff'}}>Tokens</button>
          <button className={tab==='nfts'? 'wallet-tab-active':'wallet-tab'} role="tab" aria-selected={tab==='nfts'} tabIndex={tab==='nfts'?0:-1} onClick={()=>{setTab('nfts');setTabFocus(1);}} style={{fontWeight:600,fontSize:'1.1rem',background:tab==='nfts'?'linear-gradient(90deg,#ff9800,#6366f1)':'#e0e7ff',color:tab==='nfts'?'#fff':'#6366f1',borderRadius:'1.5rem',padding:'0.5rem 2.2rem',boxShadow:'0 2px 8px #e0e7ff'}}>NFTs</button>
          <button className={tab==='activity'? 'wallet-tab-active':'wallet-tab'} role="tab" aria-selected={tab==='activity'} tabIndex={tab==='activity'?0:-1} onClick={()=>{setTab('activity');setTabFocus(2);}} style={{fontWeight:600,fontSize:'1.1rem',background:tab==='activity'?'linear-gradient(90deg,#ff9800,#6366f1)':'#e0e7ff',color:tab==='activity'?'#fff':'#6366f1',borderRadius:'1.5rem',padding:'0.5rem 2.2rem',boxShadow:'0 2px 8px #e0e7ff'}}>Activity</button>
          {/* Removed Live Platform tab */}
        </div>
        {tab==='tokens' && (
          <>
            <form onSubmit={handleSend} className="nft-mint-form" style={{marginTop:'1.2rem'}} autoComplete="off">
              <input
                ref={sendToRef}
                type="text"
                value={sendTo}
                onChange={e=>setSendTo(e.target.value)}
                placeholder="Recipient Principal"
                className="nft-mint-input"
                required
                disabled={sending}
                aria-label="Recipient Principal"
              />
              <input
                type="number"
                value={sendAmount}
                onChange={e=>setSendAmount(e.target.value)}
                placeholder="Amount"
                className="nft-mint-input"
                required
                disabled={sending}
                aria-label="Amount to send"
                min="1"
              />
              <button type="submit" className="nft-mint-button" disabled={sending || balance === 0}>{sending ? 'Sending...' : 'Send'}</button>
            </form>
            {/* Removed "Your balance is zero. Claim your bonus..." message */}
          </>
        )}
        {tab==='nfts' && (
          <>
            <form
              // No onSubmit here!
              className="nft-mint-form"
              autoComplete="off"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                alignItems: 'flex-start',
                marginBottom: '2rem'
              }}
            >
              <input
                type="text"
                value={animalId}
                onChange={e=>setAnimalId(e.target.value)}
                placeholder="Enter Animal ID (from registration)"
                className="nft-mint-input"
                aria-label="Animal ID"
                style={{
                  fontSize: '1.1rem',
                  padding: '0.7rem 1.2rem',
                  borderRadius: '1rem',
                  border: '1px solid #e0e7ff',
                  width: '100%',
                  background: '#f8fafc'
                }}
                autoComplete="off"
              />
              <input
                ref={mintBreedRef}
                type="text"
                value={mintBreed}
                onChange={e=>setMintBreed(e.target.value)}
                placeholder="Enter breed to mint NFT"
                className="nft-mint-input"
                aria-label="Breed to mint"
                style={{
                  fontSize: '1.1rem',
                  padding: '0.7rem 1.2rem',
                  borderRadius: '1rem',
                  border: '1px solid #e0e7ff',
                  width: '100%',
                  background: '#f8fafc'
                }}
                autoComplete="off"
              />
              <button
                type="button"
                className="nft-mint-button"
                // REMOVE disabled prop completely
                style={{
                  fontWeight:600,
                  fontSize:'1.1rem',
                  background:'linear-gradient(90deg,#ff9800,#6366f1)',
                  color:'#fff',
                  borderRadius:'1.5rem',
                  padding:'0.7rem 2.2rem',
                  boxShadow:'0 2px 8px #e0e7ff',
                  border:'none',
                  cursor: 'pointer'
                }}
                onClick={async () => {
                  if (minting) return;
                  if (!mintBreed.trim()) {
                    showToast('Breed name required.', 'error');
                    mintBreedRef.current && mintBreedRef.current.focus();
                    return;
                  }
                  if (!animalId.trim()) {
                    showToast('Animal ID required.', 'error');
                    return;
                  }
                  if (balance < NFT_MINT_FEE) {
                    showToast('Insufficient balance to mint NFT.', 'error');
                    return;
                  }
                  setMinting(true);
                  showToast('Transaction pending...', 'info');
                  setTimeout(() => {
                    const newNFT = {
                      id: Date.now(),
                      breed: mintBreed.trim(),
                      animalId: animalId.trim(),
                      imageUrl: animalImages[animalId] || 'https://placehold.co/200x200?text=NFT',
                    };
                    const updatedNFTs = [...myNFTs, newNFT];
                    setMyNFTs(updatedNFTs);
                    saveLocalNFTs(updatedNFTs);
                    setBalance(b => b - NFT_MINT_FEE);
                    showToast(`NFT minted for breed: ${mintBreed} (-${NFT_MINT_FEE} AMT fee)`, 'success');
                    setMintBreed("");
                    setAnimalId("");
                    setMinting(false);
                    setActivity([
                      ...activity,
                      { type: 'mint', amount: NFT_MINT_FEE, token: 'AMT', desc: `Minted NFT for ${mintBreed}`, date: new Date().toLocaleString() },
                    ]);
                  }, 1500);
                }}
              >
                {minting ? 'Pending...' : `Mint NFT (-${NFT_MINT_FEE} AMT)`}
              </button>
            </form>
            <div className="nft-gallery" style={{
              background: '#fff', borderRadius: '1.5rem', boxShadow: '0 2px 8px #e0e7ff', padding: '1.5rem'
            }}>
              {myNFTs.length === 0 ? (
                <div className="nft-empty-state" style={{textAlign:'center',color:'#6366f1'}}>
                  <span className="nft-empty-icon" aria-label="No NFTs" style={{fontSize:'2.2rem'}}>🔗</span>
                  <p className="nft-empty-text" style={{fontWeight:600}}>No breed NFTs yet.</p>
                  <p className="nft-empty-subtext" style={{color:'#009688'}}>Mint an NFT for your favorite breed!<br/>Fee: <b>{NFT_MINT_FEE} AMT</b></p>
                </div>
              ) : (
                <div className="nft-grid" style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '2rem'
                }}>
                  {myNFTs.map(nft => (
                    <div key={nft.id} className="nft-card" tabIndex={0} aria-label={`NFT for ${nft.breed}`} title={nft.breed} style={{
                      background:'#f8fafc',borderRadius:'1.2rem',boxShadow:'0 2px 8px #e0e7ff',padding:'1.2rem',display:'flex',flexDirection:'column',alignItems:'center'
                    }}>
                      <img src={nft.imageUrl} alt={nft.breed} className="nft-image" style={{
                        width:'120px',height:'120px',borderRadius:'1rem',objectFit:'cover',marginBottom:'1rem',background:'#e0e7ff'
                      }} onError={e=>e.target.src='https://placehold.co/200x200?text=NFT'} />
                      <div className="nft-info" style={{textAlign:'center'}}>
                        <div className="nft-breed" style={{fontWeight:700,fontSize:'1.1rem',color:'#6366f1'}}>{nft.breed}</div>
                        <div className="nft-id" style={{fontSize:'1rem',color:'#009688'}}>NFT #{nft.id}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {balance < NFT_MINT_FEE && <div className="wallet-warning" role="alert" style={{
              color:'#ff9800',fontWeight:600,marginTop:'1rem'
            }}>You need at least {NFT_MINT_FEE} AMT to mint an NFT.</div>}
          </>
        )}
        {tab==='activity' && (
          <div className="wallet-activity-list">
            {activity.length === 0 ? (
              <div className="nft-empty-state">
                <span className="nft-empty-icon" aria-label="No activity">📜</span>
                <p className="nft-empty-text">No activity yet.</p>
              </div>
            ) : (
              <ul style={{listStyle:'none',padding:0}}>
                {activity.slice().reverse().map((act, i) => (
                  <li key={i} className={`wallet-activity-item wallet-activity-${act.type}`} style={{marginBottom:'1.1rem',padding:'0.7rem',borderRadius:'1rem',background:'#f8fafc',boxShadow:'0 1px 4px #e0e7ff'}} tabIndex={0} aria-label={`Activity: ${act.desc}`}>
                    <div style={{fontWeight:600}}>{act.type==='send'?'-':'+'}{act.amount} {act.token}</div>
                    <div style={{fontSize:'0.98rem',color:'#6366f1'}}>{act.desc}</div>
                    <div style={{fontSize:'0.92rem',color:'#a1a1aa'}}>{act.date}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {/* Removed live platform section */}
        {toast && <div className={`wallet-toast wallet-toast-${toast.type}`} role="status">{toast.msg}</div>}
      </div>
    </div>
  );
}