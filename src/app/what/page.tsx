import Link from 'next/link'
import Image from 'next/image'

export default function WhatPage() {
  return (
    <main className="whatPage pageRoot skinWhat skinWhatBlue snapPage">
      <section className="slice slice--hub">
        <div className="sliceInner max">
          <div className="sliceGrid">
            <div className="sliceTextCol">
              <div className="frostCard">
                <p className="eyebrow">Siggy Land</p>
                <h1 className="sliceTitle">What is Siggy Land?</h1>
                <p className="sliceText">
                  Siggy Land is a living Ritual map: cats, story chapters, NFT collectibles, and useful tools in one place.
                  <br/><br/>
                  You can follow the cats into Ritual resources, ask Siggy for help, build an agent when you need one,
                  and mint Chronicle NFTs as chapters of the story.
                  <br/><br/>
                  The goal is simple: make Ritual feel like a place you can explore, not a wall of technical pages.
                  When a moment matters, keep it as part of the Chronicle.
                </p>
                <div className="actions">
                  <Link href="/" className="actLink">← Back to Home</Link>
                  <Link href="/ask" className="actLink">Ask Siggy</Link>
                </div>
              </div>
            </div>

            <div className="sliceArtCol">
              <Image
                className="sliceArtImg"
                src="/siggyland/what-hub-art.png"
                alt="Siggy hub — cats as shortcuts"
                width={500}
                height={500}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="slice slice--ask alt">
        <div className="sliceInner max">
          <div className="sliceGrid">
            <div className="sliceArtCol">
              <Image
                className="sliceArtImg"
                src="/siggyland/what-ask-art.png"
                alt="Ask Siggy — assistant concept"
                width={500}
                height={500}
              />
            </div>

            <div className="sliceTextCol">
              <div className="frostCard frostCard--accent">
                <p className="eyebrow">Use now</p>
                <h2 className="sliceTitle">Ask Siggy is your Ritual helper.</h2>
                <p className="sliceText">
                  Ask Siggy is the friendly way into Ritual. Use it to understand concepts, shape product ideas,
                  prepare launch copy, or decide which agent path makes sense.
                  <br/><br/>
                  When you are ready to go deeper, Siggy can help you move from a simple question into an agent build
                  or a Chronicle chapter.
                </p>
                <div className="actions">
                  <span className="actChip">Ritual helper</span>
                  <span className="actChip">Idea shaping</span>
                  <span className="actChip">Next steps</span>
                  <Link href="/ask" className="actLink">Ask Siggy</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="slice slice--chronicle">
        <div className="sliceInner max">
          <div className="sliceGrid">
            <div className="sliceTextCol">
              <div className="frostCard">
                <p className="eyebrow">Siggy Chronicle</p>
                <h2 className="sliceTitle">An NFT adventure made of chapters.</h2>
                <p className="sliceText">
                  Chronicle is the collectible side of Siggy Land. Mint chapters as NFTs, keep the covers, and collect
                  the whole history as the world opens.
                  <br/><br/>
                  Each chapter can store metadata, a content hash, generated cover art, and a live status layer on
                  Ritual. It feels like an adventure, but the record is real.
                </p>
                <div className="actions">
                  <span className="actChip">NFT chapters</span>
                  <span className="actChip">Story collection</span>
                  <span className="actChip">Live status</span>
                  <Link href="/ask/passport" className="actLink">Collect Chapters</Link>
                  <Link href="/story" className="actLink">Read the Chronicles</Link>
                </div>
              </div>
            </div>

            <div className="sliceArtCol">
              <Image
                className="sliceArtImg"
                src="/siggyland/what-chronicle-art.png"
                alt="Siggy Chronicle — monthly NFT"
                width={500}
                height={500}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
