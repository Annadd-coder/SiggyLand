import Image from 'next/image'
import Link from 'next/link'
import styles from './ask.module.css'

export const metadata = { title: 'Ask Siggy — coming soon' }

export default function AskPage() {
  return (
    <main className="pageRoot">
      <section className={styles.askWrap}>
        <div className={styles.titleBlock}>
          <span className={styles.soonPill}>SOON</span>
          <h1 className={styles.askTitle}>Your Ritual assistant is coming soon</h1>
          <p className={styles.askSub}>Siggys are building.</p>
        </div>

        {/* кот с мягким свечением как на твоём примере */}
        <figure className={styles.halo}>
          <Image
            src="/siggyland/ask/ask-builder-cat.jpg"  // если будет PNG — просто подмени путь
            alt="Siggy builder — coming soon"
            width={540}
            height={540}
            priority
            className={styles.catImg}
          />
        </figure>

        <Link href="/" className={styles.backBtn}>← Back to Home</Link>
      </section>
    </main>
  )
}