import type { Metadata } from 'next'
import Link from 'next/link'
import styles from './story.module.css'

export const metadata: Metadata = {
  title: 'The story awaits · SiggyLand',
  description: 'Awaiting mainnet. A quiet world. An unwritten chapter. Soon, the story begins to move.',
}

export default function StoryPage() {
  return (
    <main className={styles.page}>
      <div className={styles.stars} aria-hidden="true" />
      <section className={styles.stage} aria-labelledby="story-title">
        <div className={styles.topline}>
          <span>SiggyLand / The story</span>
          <span className={styles.chapter}>Chapter 01 <span>—</span> Unwritten</span>
        </div>

        <div className={styles.portal} aria-hidden="true">
          <div className={styles.orbit} />
          <div className={styles.ring} />
          <div className={styles.core} />
          <span className={styles.spark} />
        </div>

        <div className={styles.content}>
          <p className={styles.status}><span /> Awaiting mainnet</p>
          <h1 id="story-title">The story is about<br />to <em>awaken.</em></h1>
          <p className={styles.description}>
            Every world has a moment before it begins.<br />
            This is ours.
          </p>
          <div className={styles.divider} aria-hidden="true" />
          <p className={styles.promise}>When mainnet arrives, the stillness breaks.<br />And the first chapter begins to move.</p>
          <Link className={styles.link} href="/">Return to SiggyLand <span aria-hidden="true">↗</span></Link>
        </div>

        <footer className={styles.footer}>
          <span className={styles.soon}><span /> Mainnet coming soon</span>
          <span>Something stirs beyond the silence.</span>
          <span className={styles.edition}>The beginning / 001</span>
        </footer>
      </section>
    </main>
  )
}
