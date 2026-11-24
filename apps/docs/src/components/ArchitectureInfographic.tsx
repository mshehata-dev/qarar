export default function ArchitectureInfographic() {
  return (
    <div className="qarar-infographic not-content">
      {/* Step 1: Input / Storage */}
      <div className="infographic-node">
        <div className="node-badge">1. Store in Database</div>
        <div className="node-title">Rule as JSON AST</div>
        <div className="node-code">
          <code>{`{\n  "where": "cart.total",\n  "gte": 100\n}`}</code>
        </div>
        <p className="node-caption">Stored in Postgres, Mongo, or Redis. Updated at runtime without redeploying servers.</p>
      </div>

      {/* Connector */}
      <div className="infographic-connector">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Step 2: Engine */}
      <div className="infographic-node node-core">
        <div className="node-badge badge-core">2. Core Engine</div>
        <div className="node-title">Qarar Runtime</div>
        <div className="node-specs">
          <div className="spec-item">
            <span className="spec-dot" />
            <span>Zero <code>eval()</code></span>
          </div>
          <div className="spec-item">
            <span className="spec-dot" />
            <span>Pre-compiled closures</span>
          </div>
          <div className="spec-item">
            <span className="spec-dot" />
            <span>Sandboxed & deterministic</span>
          </div>
        </div>
        <p className="node-caption">High-throughput tree traversal with monotonic nanosecond execution.</p>
      </div>

      {/* Connector */}
      <div className="infographic-connector">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Step 3: Execution Outputs */}
      <div className="infographic-node node-outputs">
        <div className="node-badge">3. Evaluate Anywhere</div>
        <div className="output-list">
          <div className="output-row">
            <span className="output-label">In-Memory</span>
            <span className="output-result tag-emerald">true / false</span>
          </div>
          <div className="output-row">
            <span className="output-label">SQL / Mongo</span>
            <span className="output-result tag-blue">WHERE cart_total &gt;= 100</span>
          </div>
          <div className="output-row">
            <span className="output-label">Audit Log</span>
            <span className="output-result tag-amber">"Total must be at least 100"</span>
          </div>
        </div>
        <p className="node-caption">One rule definition powers memory checks, DB queries, and natural-language triage.</p>
      </div>
    </div>
  );
}
