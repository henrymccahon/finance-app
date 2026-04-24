import s from "../styles/EmptyState.module.css";

function EmptyState({ icon = "📋", title, description, children }) {
  return (
    <div className={s.wrap}>
      <span className={s.icon}>{icon}</span>
      <h3 className={s.title}>{title}</h3>
      {description && <p className={s.desc}>{description}</p>}
      {children}
    </div>
  );
}

export default EmptyState;
