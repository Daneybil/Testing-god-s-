/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  Coins, 
  Trophy, 
  Gift, 
  ChevronRight, 
  ExternalLink, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRightLeft,
  Users,
  Zap
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CONTRACT_ADDRESS, ABI } from './constants';

declare global {
  interface Window {
    ethereum?: any;
  }
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface LeaderboardEntry {
  address: string;
  count: number;
}

interface ContractState {
  symbol: string;
  name: string;
  totalSupply: string;
  airdropClaims: number;
  maxAirdropClaims: number;
  phase1Price: string;
  phase2Price: string;
  userBalance: string;
  hasClaimedAirdrop: boolean;
}

// --- Components ---

const Card = ({ children, className, title, icon: Icon }: { children: React.ReactNode, className?: string, title?: string, icon?: any }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      "relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 md:p-8",
      "before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-br before:from-cyan-500/10 before:to-purple-500/10",
      className
    )}
  >
    {title && (
      <div className="mb-6 flex items-center gap-3">
        {Icon && <Icon className="h-6 w-6 text-cyan-400" />}
        <h2 className="text-xl font-bold tracking-tight text-white uppercase">{title}</h2>
      </div>
    )}
    {children}
  </motion.div>
);

const Button = ({ 
  children, 
  onClick, 
  disabled, 
  variant = 'primary', 
  className,
  loading
}: { 
  children: React.ReactNode, 
  onClick?: () => void, 
  disabled?: boolean, 
  variant?: 'primary' | 'secondary' | 'outline',
  className?: string,
  loading?: boolean
}) => {
  const variants = {
    primary: "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]",
    secondary: "bg-white/10 text-white hover:bg-white/20",
    outline: "border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "relative flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : children}
    </button>
  );
};

export default function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [state, setState] = useState<ContractState | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Presale Inputs
  const [maticAmount, setMaticAmount] = useState<string>("");
  const [referrer, setReferrer] = useState<string>(ethers.ZeroAddress);

  // Initialize Referrer from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && ethers.isAddress(ref)) {
      setReferrer(ref);
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError("Please install MetaMask or Trust Wallet");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      
      // Check network (Polygon Mainnet: 137)
      const network = await browserProvider.getNetwork();
      if (network.chainId !== 137n) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x89' }], // 137 in hex
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x89',
                chainName: 'Polygon Mainnet',
                nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                rpcUrls: ['https://polygon-rpc.com/'],
                blockExplorerUrls: ['https://polygonscan.com/'],
              }],
            });
          }
        }
      }

      const signer = await browserProvider.getSigner();
      const aiGodsContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      
      setAccount(accounts[0]);
      setProvider(browserProvider);
      setContract(aiGodsContract);
      
      await refreshData(aiGodsContract, accounts[0]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async (c: ethers.Contract, userAddr: string) => {
    try {
      const [
        symbol, 
        name, 
        totalSupply, 
        claims, 
        maxClaims, 
        p1Price, 
        p2Price, 
        balance,
        hasClaimed,
        topReferrers
      ] = await Promise.all([
        c.symbol(),
        c.name(),
        c.totalSupply(),
        c.airdropClaimsCount(),
        c.MAX_AIRDROP_CLAIMS(),
        c.PHASE1_PRICE_USD(),
        c.PHASE2_PRICE_USD(),
        c.balanceOf(userAddr),
        c.hasClaimedAirdrop(userAddr),
        c.getTopReferrers()
      ]);

      setState({
        symbol,
        name,
        totalSupply: ethers.formatEther(totalSupply),
        airdropClaims: Number(claims),
        maxAirdropClaims: Number(maxClaims),
        phase1Price: ethers.formatUnits(p1Price, 8), // Assuming 8 decimals for USD feeds
        phase2Price: ethers.formatUnits(p2Price, 8),
        userBalance: ethers.formatEther(balance),
        hasClaimedAirdrop: hasClaimed
      });

      const [addrs, counts] = topReferrers;
      const formattedLeaderboard = addrs.map((addr: string, i: number) => ({
        address: addr,
        count: Number(counts[i])
      })).filter((e: any) => e.address !== ethers.ZeroAddress);
      
      setLeaderboard(formattedLeaderboard);
    } catch (err) {
      console.error("Error refreshing data:", err);
    }
  };

  const handleBuy = async () => {
    if (!contract || !maticAmount) return;
    try {
      setLoading(true);
      setError(null);
      const tx = await contract.buyPreSale(referrer, {
        value: ethers.parseEther(maticAmount)
      });
      await tx.wait();
      setSuccess("Successfully purchased AI Gods tokens!");
      if (account) await refreshData(contract, account);
    } catch (err: any) {
      setError(err.reason || err.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClaimAirdrop = async () => {
    if (!contract) return;
    try {
      setLoading(true);
      setError(null);
      const tx = await contract.claimAirdrop();
      await tx.wait();
      setSuccess("Airdrop claimed successfully!");
      if (account) await refreshData(contract, account);
    } catch (err: any) {
      setError(err.reason || err.message || "Claim failed");
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (!account) return;
    const link = `${window.location.origin}?ref=${account}`;
    navigator.clipboard.writeText(link);
    setSuccess("Referral link copied to clipboard!");
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-cyan-500/30">
      {/* Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] h-[50%] w-[50%] rounded-full bg-purple-500/10 blur-[120px]" />
        <div className="absolute bottom-0 left-[20%] h-[30%] w-[60%] rounded-full bg-blue-500/5 blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/20">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter text-white uppercase">AI GODS</span>
          </div>

          <div className="flex items-center gap-4">
            {account ? (
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
                <div className="hidden flex-col items-end md:flex">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Connected</span>
                  <span className="text-sm font-mono font-medium">{account.slice(0, 6)}...{account.slice(-4)}</span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500" />
              </div>
            ) : (
              <Button onClick={connectWallet} loading={loading}>
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-12">
        {/* Hero Section */}
        <section className="mb-20 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-sm font-bold text-cyan-400"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500"></span>
            </span>
            PRESALE IS LIVE
          </motion.div>
          <h1 className="mb-6 text-5xl font-black tracking-tight md:text-7xl lg:text-8xl">
            THE ERA OF <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              AI GODS
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-white/60">
            Join the most advanced AI ecosystem on Polygon. Secure your tokens now and be part of the decentralized intelligence revolution.
          </p>
        </section>

        {/* Notifications */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-400"
            >
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">{error}</p>
            </motion.div>
          )}
          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-400"
            >
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-medium">{success}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid Content */}
        <div className="grid gap-8 lg:grid-cols-12">
          
          {/* Presale Card */}
          <div className="lg:col-span-7">
            <Card title="Token Presale" icon={Coins}>
              <div className="mb-8 grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-white/40">Phase 1 Price</span>
                  <p className="text-2xl font-black text-white">${state?.phase1Price || "0.00"}</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-white/40">Your Balance</span>
                  <p className="text-2xl font-black text-cyan-400">{state?.userBalance || "0.00"} {state?.symbol || "AIG"}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold uppercase tracking-widest text-white/40">Amount to Buy (MATIC)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={maticAmount}
                      onChange={(e) => setMaticAmount(e.target.value)}
                      placeholder="0.0"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-xl font-bold text-white outline-none focus:border-cyan-500/50"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg bg-white/10 px-3 py-1 text-sm font-bold">
                      MATIC
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full py-5 text-lg" 
                  onClick={handleBuy} 
                  loading={loading}
                  disabled={!account || !maticAmount}
                >
                  {account ? "Purchase Tokens" : "Connect Wallet to Buy"}
                </Button>

                <p className="text-center text-xs text-white/40">
                  Transaction will be processed on Polygon Mainnet. Ensure you have enough MATIC for gas.
                </p>
              </div>
            </Card>

            {/* Airdrop Card */}
            <Card title="Airdrop" icon={Gift} className="mt-8">
              <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
                <div className="flex-1">
                  <p className="mb-2 text-lg font-bold text-white">Claim Your Free Tokens</p>
                  <p className="text-sm text-white/60">
                    Be an early adopter! We've reserved a portion of tokens for our community.
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="h-2 flex-1 rounded-full bg-white/10 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" 
                        style={{ width: `${(state?.airdropClaims || 0) / (state?.maxAirdropClaims || 1) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-white/40">
                      {state?.airdropClaims || 0} / {state?.maxAirdropClaims || 0} Claimed
                    </span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full md:w-auto"
                  onClick={handleClaimAirdrop}
                  loading={loading}
                  disabled={!account || state?.hasClaimedAirdrop}
                >
                  {state?.hasClaimedAirdrop ? "Already Claimed" : "Claim Airdrop"}
                </Button>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-8 lg:col-span-5">
            {/* Leaderboard */}
            <Card title="Referral Leaderboard" icon={Trophy}>
              <div className="space-y-4">
                {leaderboard.length > 0 ? leaderboard.map((entry, i) => (
                  <div key={entry.address} className="flex items-center justify-between rounded-2xl bg-white/5 p-4">
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg font-black",
                        i === 0 ? "bg-yellow-500 text-black" : 
                        i === 1 ? "bg-slate-300 text-black" : 
                        i === 2 ? "bg-amber-600 text-black" : "bg-white/10 text-white"
                      )}>
                        {i + 1}
                      </span>
                      <span className="font-mono text-sm text-white/80">
                        {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs font-bold uppercase tracking-widest text-white/40">Referrals</span>
                      <span className="text-lg font-black text-cyan-400">{entry.count}</span>
                    </div>
                  </div>
                )) : (
                  <div className="py-12 text-center text-white/40">
                    <Users className="mx-auto mb-4 h-12 w-12 opacity-20" />
                    <p>No referrers yet. Be the first!</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Referral Program */}
            <Card title="Referral Program" icon={Users}>
              <p className="mb-6 text-sm text-white/60">
                Invite your friends and earn bonus tokens for every purchase they make.
              </p>
              {account ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-dashed border-white/20 p-4 text-center">
                    <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/40">Your Referral Link</p>
                    <p className="truncate font-mono text-sm text-cyan-400">
                      {window.location.origin}?ref={account.slice(0, 6)}...
                    </p>
                  </div>
                  <Button variant="secondary" className="w-full" onClick={copyReferralLink}>
                    Copy Link
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl bg-white/5 p-6 text-center">
                  <p className="text-sm font-medium text-white/40">Connect your wallet to get your referral link</p>
                </div>
              )}
            </Card>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-white/5 bg-black/80 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 md:grid-cols-3">
            <div>
              <div className="mb-6 flex items-center gap-2">
                <Zap className="h-6 w-6 text-cyan-400" />
                <span className="text-xl font-black tracking-tighter text-white uppercase">AI GODS</span>
              </div>
              <p className="text-sm text-white/40">
                The decentralized intelligence layer for the next generation of web3 applications.
              </p>
            </div>
            
            <div>
              <h4 className="mb-6 text-xs font-bold uppercase tracking-widest text-white">Resources</h4>
              <ul className="space-y-4 text-sm text-white/40">
                <li><a href="#" className="hover:text-cyan-400">Whitepaper</a></li>
                <li><a href="#" className="hover:text-cyan-400">Documentation</a></li>
                <li><a href="#" className="hover:text-cyan-400">Audit Report</a></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-6 text-xs font-bold uppercase tracking-widest text-white">Contract</h4>
              <div className="flex items-center gap-2 rounded-xl bg-white/5 p-3">
                <span className="truncate font-mono text-xs text-white/60">{CONTRACT_ADDRESS}</span>
                <a 
                  href={`https://polygonscan.com/address/${CONTRACT_ADDRESS}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
          
          <div className="mt-12 border-t border-white/5 pt-8 text-center text-xs text-white/20">
            © 2026 AI GODS Ecosystem. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
