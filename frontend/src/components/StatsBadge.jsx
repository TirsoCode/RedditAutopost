export default function StatsBadge({ upvotes = 0, comments = 0 }) {
  return (
    <div className="stats-badge">
      <span className="up" title="Upvotes">{upvotes} upvotes</span>
      <span title="Comentarios">{comments} comentarios</span>
    </div>
  );
}