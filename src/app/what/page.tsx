import Link from 'next/link'

export default function WhatPage() {
  return (
    // добавил только классы skinWhat + skinWhatBlue + snapPage (зимний фон и плавный snap-скролл)
    <main className="whatPage pageRoot skinWhat skinWhatBlue snapPage">
      {/* Block 1 — Home Hub */}
      <section className="slice slice--hub">
        <div className="sliceInner max">
          <div className="sliceGrid">
            <div className="sliceTextCol">
              {/* обернул текст в стеклянную карточку */}
              <div className="frostCard">
                <p className="eyebrow">Home hub</p>
                <h1 className="sliceTitle">What is Siggy Land?</h1>
                <p className="sliceText">
                  Siggy Land is a calm, friendly landing for the Ritual ecosystem.
                  <br/><br/>
                  Instead of buttons, you meet cats. Each cat is a doorway. On the left, they lead into core Ritual
                  resources: Docs, Repositories, Release notes. On the right, they open ecosystem projects that live around Ritual.
                  <br/><br/>
                  As Ritual grows, this little world of projects will grow and evolve too. Quiet , zero clutter 
                  just a cozy way into Ritual and its ecosystem.
                </p>
                <div className="actions">
                  <Link href="/" className="actLink">← Back to Home</Link>
                </div>
              </div>
            </div>

            {/* арт сбоку, не фон */}
            <div className="sliceArtCol">
              <img
                className="sliceArtImg"
                src="/siggyland/what-hub-art.png"
                alt="Siggy hub — cats as shortcuts"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Block 2 — Ask Siggy (SOON) */}
      <section className="slice slice--ask alt">
        <div className="sliceInner max">
          <div className="sliceGrid">
            <div className="sliceArtCol">
              <img
                className="sliceArtImg"
                src="/siggyland/what-ask-art.png"
                alt="Ask Siggy — assistant concept"
              />
            </div>

            <div className="sliceTextCol">
              {/* стеклянная карточка с акцентом */}
              <div className="frostCard frostCard--accent">
                <span className="soonTag">SOON</span>
                <p className="eyebrow">Ask Siggy</p>
                <h2 className="sliceTitle">Ask Siggy</h2>
                <p className="sliceText">
                  Ask Siggy a question and get a short, human answer  no fluff. Each answer comes with a trust mark
                  and expandable details, so you can verify anything when you want more.
                  <br/><br/>
                  Siggy is your personal Ritual assistant.
                  He supports you, explains what is going on, and helps you find the right place in the Ritual world —
                  all inside this one calm window.
                </p>
                <div className="actions">
                  <span className="actChip">Concise</span>
                  <span className="actChip">Source-aware</span>
                  <span className="actChip">Builder-friendly</span>
                  {/* мягкий CTA — опционально, не ломает сетку */}
                  <Link href="/ask" className="actLink">Open Ask Siggy</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Block 3 — Siggy Chronicle (SOON) */}
      <section className="slice slice--chronicle">
        <div className="sliceInner max">
          <div className="sliceGrid">
            <div className="sliceTextCol">
              {/* обычная карточка */}
              <div className="frostCard">
                <span className="soonTag">SOON</span>
                <p className="eyebrow">Siggy Chronicle</p>
                <h2 className="sliceTitle">The monthly story as a collectible</h2>
                <p className="sliceText">
                  Once a month we mint a compact Chronicle NFT: five crisp notes that capture what mattered  releases,
                  integrations, community sparks, and visible progress. We simply curate the most interesting moments
                  from Ritual and its community and preserve them on-chain as a clear snapshot of the journey.
                </p>
                <div className="actions">
                  <span className="actChip">Monthly</span>
                  <span className="actChip">Editorial signal</span>
                  <span className="actChip">On-chain memory</span>
                  {/* здесь — ссылка на твою страницу story, как просил */}
                  <Link href="/story" className="actLink">Read the Chronicles</Link>
                </div>
              </div>
            </div>

            <div className="sliceArtCol">
              <img
                className="sliceArtImg"
                src="/siggyland/what-chronicle-art.png"
                alt="Siggy Chronicle — monthly NFT"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}