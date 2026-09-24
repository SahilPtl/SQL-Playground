export function SchemaBrowser({schema,onRefresh,busy}) {
  return <section className="panel schema-panel"><div className="panel-heading"><span><b className="pane-number">01</b> EXPLORER</span><button className="icon-button" title="Refresh schema" aria-label="Refresh schema" disabled={busy} onClick={onRefresh}>↻</button></div>
    <div className="database-label"><span className="status-dot"/> personal_workspace <small>SQLite</small></div>
    <div className="schema-list">{schema.tables.map(table=><details key={table.name} open><summary><span className="table-icon">▦</span> {table.name}<small>{table.columns.length}</small></summary><div className="columns">{table.columns.map(c=><div key={c.name}><span className={c.primaryKey?'key':''}>{c.primaryKey?'◆':table.foreignKeys.some(f=>f.from===c.name)?'↗':'·'}</span><span>{c.name}</span><small>{c.type}</small></div>)}{table.foreignKeys.map((f,i)=><p className="fk-note" key={i}>{f.from} → {f.table}.{f.to || 'PK'}</p>)}</div></details>)}</div>
    <div className="schema-footer">{schema.tables.length} tables · Private to your account</div>
  </section>;
}
export function ERDiagram({schema}) {
  const positions=schema.tables.map((_,i)=>({x:24+(i%2)*270,y:28+Math.floor(i/2)*250}));
  const height=Math.max(250,Math.ceil(schema.tables.length/2)*250+20);
  return <section className="panel er-panel"><div className="panel-heading"><span><b className="pane-number">02</b> RELATIONSHIPS</span><span className="tag">LIVE SCHEMA</span></div>
    <div className="er-scroll"><div className="er-canvas" style={{height,width:570}}>
      <svg aria-label="Foreign key relationships" width="570" height={height}><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#a5d983"/></marker></defs>
        {schema.tables.flatMap((t,i)=>t.foreignKeys.map((f,j)=>{const target=schema.tables.findIndex(t=>t.name===f.table);if(target<0)return null;const a=positions[i],b=positions[target];return <path key={`${i}-${j}`} d={`M ${a.x+110} ${a.y+38} C ${a.x+250} ${a.y-15}, ${b.x+250} ${b.y-15}, ${b.x+110} ${b.y+38}`} stroke="#a5d983" fill="none" strokeWidth="1.7" markerEnd="url(#arrow)"><title>{t.name}.{f.from} → {f.table}.{f.to}</title></path>;}))}
      </svg>
      {schema.tables.map((table,i)=><article className="er-table" key={table.name} style={{left:positions[i].x,top:positions[i].y}}><h3><span>▦</span> {table.name}</h3>{table.columns.map(c=><div key={c.name}><span className={c.primaryKey?'key':''}>{c.primaryKey?'◆':table.foreignKeys.some(f=>f.from===c.name)?'↗':'·'}</span><span>{c.name}</span><small>{c.type}</small></div>)}</article>)}
      {!schema.tables.length&&<p className="empty">Create a table to see it here.</p>}
    </div></div><div className="panel-foot">◆ Primary key <span>↗ Foreign key · arrows point to parent tables</span></div>
  </section>;
}
