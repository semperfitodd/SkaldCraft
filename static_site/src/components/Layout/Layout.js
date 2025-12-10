import './Layout.css';

function Layout({ children, header }) {
  return (
    <div className="layout">
      {header && <header className="layout__header">{header}</header>}
      <main className="layout__main">{children}</main>
    </div>
  );
}

export default Layout;
