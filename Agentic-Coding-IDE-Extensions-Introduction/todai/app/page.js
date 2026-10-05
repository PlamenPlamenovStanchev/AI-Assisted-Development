import Script from 'next/script';
export default function Home() {
  return <><div id="todai"><div className="boot">tod<span>AI</span><p>Making room for what matters…</p></div></div><noscript>Please enable JavaScript to use todAI.</noscript><Script src="/app.js" type="module" strategy="afterInteractive" /></>;
}
