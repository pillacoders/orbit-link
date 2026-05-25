'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Coins, Network, Shield, Cpu, Zap, ChevronRight, Lock } from 'lucide-react';
import styles from './docs.module.css';

interface DocsSection {
  id: string;
  title: string;
  icon: any;
  content: React.ReactNode;
}

const DOCS_SECTIONS: DocsSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: BookOpen,
    content: (
      <>
        <h2>What is OrbitLink?</h2>
        <p>
          OrbitLink is a <strong>Decentralized AI Edge Relay Infrastructure</strong> that transforms idle bandwidth and compute into a globally distributed network powering AI inference routing, distributed data indexing, and privacy-preserving edge intelligence.
        </p>

        <h3>Core Value Proposition</h3>
        <p>
          Unlike traditional DePIN networks that simply share bandwidth, OrbitLink creates a purpose-built relay mesh optimized for:
        </p>
        <ul>
          <li><strong>AI Inference Routing</strong> — Sub-100ms relay of inference requests across edge nodes</li>
          <li><strong>Distributed Data Indexing</strong> — Decentralized caching and indexing of AI training datasets</li>
          <li><strong>Privacy-Preserving Intelligence</strong> — Zero-knowledge relay proofs ensure data privacy</li>
          <li><strong>Edge Traffic Optimization</strong> — Smart routing based on proximity, capacity, and quality</li>
        </ul>

        <h3>How It Works</h3>
        <ol>
          <li><strong>Install</strong> the OrbitLink browser extension or desktop client</li>
          <li><strong>Connect</strong> your identity via email, Google, or Web3 wallet</li>
          <li><strong>Relay</strong> AI workloads automatically through your connection</li>
          <li><strong>Earn</strong> Orbs based on relay quality, uptime, and contribution</li>
        </ol>

        <h3>Network Architecture</h3>
        <p>
          OrbitLink operates as a three-layer architecture:
        </p>
        <table>
          <thead>
            <tr>
              <th>Layer</th>
              <th>Function</th>
              <th>Protocol</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Relay Layer</strong></td>
              <td>Routes AI inference traffic between requestors and compute providers</td>
              <td>WebSocket + gRPC</td>
            </tr>
            <tr>
              <td><strong>Consensus Layer</strong></td>
              <td>Validates relay proofs and distributes rewards</td>
              <td>Polygon PoS</td>
            </tr>
            <tr>
              <td><strong>Data Layer</strong></td>
              <td>Indexes and caches distributed datasets</td>
              <td>IPFS + Custom DHT</td>
            </tr>
          </tbody>
        </table>
      </>
    ),
  },
  {
    id: 'tokenomics',
    title: 'Orbs Ecosystem',
    icon: Coins,
    content: (
      <>
        <h2>Orbs Ecosystem</h2>
        <p>
          Orbs are the native utility points of the OrbitLink network, representing your contribution and participation in the ecosystem.
        </p>

        <h3>Orbs Distribution</h3>
        <table>
          <thead>
            <tr>
              <th>Allocation</th>
              <th>Percentage</th>
              <th>Vesting</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Node Operators & Relay Mining</td>
              <td>40%</td>
              <td>Released per epoch</td>
            </tr>
            <tr>
              <td>Development & Infrastructure</td>
              <td>20%</td>
              <td>4-year linear vest</td>
            </tr>
            <tr>
              <td>Community & Ecosystem</td>
              <td>15%</td>
              <td>Unlocked at TGE</td>
            </tr>
            <tr>
              <td>Team & Advisors</td>
              <td>15%</td>
              <td>1-year cliff, 3-year vest</td>
            </tr>
            <tr>
              <td>Treasury & Strategic</td>
              <td>10%</td>
              <td>DAO-governed</td>
            </tr>
          </tbody>
        </table>

        <h3>Earning Mechanisms</h3>
        <p>
          <strong>Relay Mining</strong> — The primary earning mechanism. Points are awarded based on:
        </p>
        <ul>
          <li><strong>Uptime Score</strong> (40%) — Continuous availability of your node</li>
          <li><strong>Relay Quality</strong> (30%) — Latency, throughput, and success rate</li>
          <li><strong>Network Contribution</strong> (20%) — Volume of data relayed</li>
          <li><strong>Trust Score</strong> (10%) — Anti-sybil reputation metric</li>
        </ul>
        <p>
          <strong>Epoch Rewards</strong> — Each epoch distributes a fixed pool of Orbs to participants proportional to their contribution score. Multipliers boost early participants.
        </p>
        <p>
          <strong>Referral Mining</strong> — Earn 10% of your referrals' relay earnings in perpetuity.
        </p>
        <p>
          <strong>Achievement Bonuses</strong> — One-time XP and Orbs bonuses for reaching milestones.
        </p>

        <h3>Anti-Sybil Measures</h3>
        <p>
          OrbitLink uses a multi-signal trust score to prevent gaming:
        </p>
        <ul>
          <li>Connection quality fingerprinting</li>
          <li>Geographic diversity analysis</li>
          <li>Behavioral consistency checks</li>
          <li>Referral chain depth limits</li>
        </ul>
      </>
    ),
  },
  {
    id: 'architecture',
    title: 'Architecture',
    icon: Network,
    content: (
      <>
        <h2>Technical Architecture</h2>
        <h3>Relay Protocol</h3>
        <p>
          The OrbitLink relay protocol is designed for high-throughput, low-latency data relay with cryptographic verification.
        </p>
        <pre>
          <code>
{`┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  AI Client   │────▶│  Edge Node   │────▶│  Compute     │
│  (Requestor) │     │  (Relay)     │     │  Provider    │
└──────────────┘     └──────────────┘     └──────────────┘
       │                     │                    │
       ▼                     ▼                    ▼
  Request Signed      Relay Proof          Result Returned
  with Session Key    Generated            via Same Path`}
          </code>
        </pre>

        <h3>Proof of Relay</h3>
        <p>
          Each relay event generates a cryptographic proof containing:
        </p>
        <ul>
          <li><strong>Relay Hash</strong> — SHA-256 of the relayed data envelope</li>
          <li><strong>Timestamp</strong> — Block-accurate timestamp from the consensus layer</li>
          <li><strong>Route Path</strong> — Anonymized path through the relay mesh</li>
          <li><strong>Quality Metrics</strong> — Latency, jitter, and throughput measurements</li>
        </ul>

        <h3>Node Requirements</h3>
        <table>
          <thead>
            <tr>
              <th>Requirement</th>
              <th>Minimum</th>
              <th>Recommended</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Connection</td>
              <td>10 Mbps</td>
              <td>50+ Mbps</td>
            </tr>
            <tr>
              <td>Uptime</td>
              <td>4 hrs/day</td>
              <td>12+ hrs/day</td>
            </tr>
            <tr>
              <td>Platform</td>
              <td>Chrome Extension</td>
              <td>Desktop Client</td>
            </tr>
            <tr>
              <td>Memory</td>
              <td>256 MB available</td>
              <td>512+ MB</td>
            </tr>
          </tbody>
        </table>

        <h3>Security Model</h3>
        <ul>
          <li><strong>Transport:</strong> TLS 1.3 for all relay connections</li>
          <li><strong>Identity:</strong> JWT + optional Web3 wallet signatures</li>
          <li><strong>Data Privacy:</strong> Zero-knowledge relay — nodes cannot inspect payload content</li>
          <li><strong>DDoS Protection:</strong> Rate limiting + reputation-gated relay assignment</li>
        </ul>
      </>
    ),
  },
  {
    id: 'trust',
    title: 'Trust & Reputation',
    icon: Shield,
    content: (
      <>
        <h2>Trust & Reputation System</h2>
        <h3>Trust Score Calculation</h3>
        <p>
          Every node operator has a Trust Score (0–100) that determines relay assignment priority and reward multipliers.
        </p>
        <p><strong>Components:</strong></p>
        <table>
          <thead>
            <tr>
              <th>Factor</th>
              <th>Weight</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Uptime Consistency</td>
              <td>30%</td>
              <td>Continuous availability without gaps</td>
            </tr>
            <tr>
              <td>Connection Quality</td>
              <td>25%</td>
              <td>Average relay latency and success rate</td>
            </tr>
            <tr>
              <td>Network Age</td>
              <td>20%</td>
              <td>Time since first contribution</td>
            </tr>
            <tr>
              <td>Referral Quality</td>
              <td>15%</td>
              <td>Trust scores of referred operators</td>
            </tr>
            <tr>
              <td>Behavioral Signals</td>
              <td>10%</td>
              <td>Pattern analysis for sybil detection</td>
            </tr>
          </tbody>
        </table>

        <h3>Reputation Tiers</h3>
        <table>
          <thead>
            <tr>
              <th>Tier</th>
              <th>Score</th>
              <th>Benefits</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>🟢 Trusted</td>
              <td>80–100</td>
              <td>Priority relay assignment, 1.5x multiplier</td>
            </tr>
            <tr>
              <td>🔵 Verified</td>
              <td>60–79</td>
              <td>Standard relay assignment, 1.2x multiplier</td>
            </tr>
            <tr>
              <td>🟡 Provisional</td>
              <td>40–59</td>
              <td>Limited relay assignment, 1.0x multiplier</td>
            </tr>
            <tr>
              <td>🔴 Restricted</td>
              <td>0–39</td>
              <td>Relay disabled, under review</td>
            </tr>
          </tbody>
        </table>

        <h3>Appeals Process</h3>
        <p>
          Operators who believe their trust score is incorrect can submit an appeal through the settings page. Appeals are reviewed within 48 hours.
        </p>
      </>
    ),
  },
  {
    id: 'epochs',
    title: 'Seasonal Epochs',
    icon: Cpu,
    content: (
      <>
        <h2>Seasonal Epoch System</h2>
        <p>
          OrbitLink operates on a seasonal epoch model, inspired by competitive gaming seasons. Each epoch introduces new mechanics, increased rewards, and exclusive cosmetics.
        </p>

        <h3>Current: Epoch 1 — Genesis Relay</h3>
        <ul>
          <li><strong>Duration:</strong> January 2025 – June 2025</li>
          <li><strong>Reward Pool:</strong> 5,000,000 Orbs</li>
          <li><strong>Multiplier:</strong> 1.5x for all contributions</li>
        </ul>
        <p>
          Genesis Relay is the founding epoch. Early operators earn boosted rewards and exclusive Genesis badges that will never be available again.
        </p>

        <h3>Upcoming: Epoch 2 — Edge Intelligence</h3>
        <ul>
          <li><strong>Duration:</strong> July 2025 – December 2025</li>
          <li><strong>Reward Pool:</strong> 10,000,000 Orbs</li>
          <li><strong>New Features:</strong></li>
          <ul>
            <li>AI inference routing goes live</li>
            <li>Guild competitions with seasonal rankings</li>
            <li>Staking mechanisms for governance participation</li>
          </ul>
        </ul>

        <h3>Epoch Rewards Distribution</h3>
        <p>
          At the end of each epoch:
        </p>
        <ol>
          <li>Final contribution scores are calculated</li>
          <li>Reward pool is distributed proportionally</li>
          <li>Top contributors receive exclusive badges and cosmetics</li>
          <li>Epoch leaderboard is immortalized on-chain</li>
        </ol>

        <h3>Badge System</h3>
        <p>
          Badges earned during epochs are permanent NFTs on Polygon, serving as proof of early contribution to the OrbitLink network.
        </p>
      </>
    ),
  },
  {
    id: 'guilds',
    title: 'Guild System',
    icon: Zap,
    content: (
      <>
        <h2>Guild System</h2>
        <p>
          Guilds are collaborative groups of node operators who pool their contributions for competitive advantages and shared rewards.
        </p>

        <h3>Creating a Guild</h3>
        <p>
          Any operator can create a guild with:
        </p>
        <ul>
          <li><strong>Name</strong> — Unique guild name (3–30 characters)</li>
          <li><strong>Tag</strong> — Short identifier (2–5 characters, displayed as [TAG])</li>
          <li><strong>Visibility</strong> — Public (open join) or Private (invite only)</li>
        </ul>

        <h3>Guild Mechanics</h3>
        <p>
          <strong>Guild XP</strong> — Aggregated from all member contributions. Higher guild XP unlocks perks:
        </p>
        <ul>
          <li>Level 5: +5% member earning boost</li>
          <li>Level 10: Custom guild banner</li>
          <li>Level 15: +10% member earning boost</li>
          <li>Level 20: Priority relay assignment for all members</li>
        </ul>

        <p>
          <strong>Guild Competitions</strong> — Seasonal rankings between guilds based on:
        </p>
        <ul>
          <li>Total relay volume</li>
          <li>Average member trust score</li>
          <li>Member growth rate</li>
          <li>Achievement completion rate</li>
        </ul>

        <h3>Guild Leaderboard</h3>
        <p>
          The top 10 guilds each epoch receive bonus Orbs rewards distributed to all members proportionally.
        </p>

        <h3>Leadership</h3>
        <ul>
          <li><strong>Leader</strong> — Full guild management (kick, promote, settings)</li>
          <li><strong>Officers</strong> — Can accept/reject join requests</li>
          <li><strong>Members</strong> — Standard contribution and chat access</li>
        </ul>
        <p>
          Guild leaders can transfer leadership or disband the guild at any time.
        </p>
      </>
    ),
  },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('overview');
  const currentDoc = DOCS_SECTIONS.find(s => s.id === activeSection) || DOCS_SECTIONS[0];

  return (
    <div className={styles.docsPage}>
      {/* Sidebar */}
      <nav className={styles.sidebar}>
        <div className={styles.sidebarSticky}>
          <h2>Documentation</h2>
          <div className={styles.navList}>
            {DOCS_SECTIONS.map(section => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  className={`${styles.navItem} ${activeSection === section.id ? styles.navActive : ''}`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <Icon size={16} />
                  <span>{section.title}</span>
                  <ChevronRight size={14} className={styles.navChevron} />
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Content */}
      <motion.main
        key={activeSection}
        className={styles.content}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className={styles.contentInner}>
          {currentDoc.content}
        </div>
      </motion.main>
    </div>
  );
}
