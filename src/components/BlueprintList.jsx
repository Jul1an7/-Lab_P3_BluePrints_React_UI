export default function BlueprintList({ items = [], onSelect }) {
  if (!items.length) return <p>No hay blueprints para este autor.</p>

  return (
    <table className="table">
      <thead>
      <tr>
        <th>Nombre</th>
        <th>Puntos</th>
        <th>Acción</th>
      </tr>
      </thead>
      <tbody>
      {items.map((bp) => (
        <tr key={bp.name}>
          <td>{bp.name}</td>
          <td>{bp.points ? bp.points.length : 0}</td>
          <td>
            <button className="btn primary" onClick={() => onSelect(bp)}>
              Open
            </button>
          </td>
        </tr>
      ))}
      </tbody>
    </table>
  )
}