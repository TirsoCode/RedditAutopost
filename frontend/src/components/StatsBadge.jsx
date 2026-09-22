export default function StatsBadge({ upvotes = 0, comments = 0 }) {
  return (
    <div className="stats-badge">
      <span title="Upvotes">▲ {upvotes}</span>
      <span title="Comentarios">💬 {comments}</span>
    </div>
  );
}