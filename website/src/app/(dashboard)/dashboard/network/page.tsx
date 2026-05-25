'use client';

import { motion } from 'framer-motion';
import { Globe2, Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import styles from './network.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function NetworkPage() {
  return (
    <div className={styles.networkPage}>
      <motion.div 
        initial="hidden" 
        animate="visible" 
        variants={fadeUp}
        className={styles.comingSoonCard}
      >
        <div className={styles.iconWrapper}>
          <Globe2 size={42} className={styles.spin} />
        </div>

        <div className={styles.titleSection}>
          <h1>Network Hub</h1>
          <div className={styles.badge}>
            <Lock size={12} /> Coming in Epoch 2
          </div>
        </div>

        <p className={styles.description}>
          Geographical node distribution, connection latency arcs, live routing activity feeds, and region-by-region traffic analysis will be unlocked in the upcoming Epoch 2 network upgrade. Connect your extension and accumulate Orbs to prepare.
        </p>

        <div className={styles.buttonContainer}>
          <Link href="/dashboard/tasks" className="btn-solid" style={{ flex: 1 }}>
            Boost Rewards <ArrowRight size={16} style={{ marginLeft: 8 }} />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
