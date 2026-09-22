import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Gym maintenance, made clear</p>
        <h1>Keep your gym equipment working.</h1>
        <p className="lede">FitFix helps independent gyms report faults, assign repairs, and keep equipment history in one place.</p>
        <div><Link className="button button--accent" href="/sign-up">Create your gym workspace</Link></div>
      </section>
      <section aria-labelledby="workflow-heading">
        <h2 id="workflow-heading">From fault to follow-through.</h2>
        <div className="grid">
          <article className="card"><h3>Report</h3><p>Scan a QR code or find equipment by name and record the problem quickly.</p></article>
          <article className="card"><h3>Assign</h3><p>Give every repair an owner, severity, and target date.</p></article>
          <article className="card"><h3>Track</h3><p>Keep progress, downtime, costs, and closure history together.</p></article>
        </div>
      </section>
    </main>
  );
}
