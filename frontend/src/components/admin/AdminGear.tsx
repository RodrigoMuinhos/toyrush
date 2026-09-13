import "./adminPanel.css";

export function AdminGear({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="admin-gear"
      onClick={onClick}
      aria-label="Central de controle"
      title="Central de controle"
    >
      ⚙
    </button>
  );
}

export default AdminGear;
