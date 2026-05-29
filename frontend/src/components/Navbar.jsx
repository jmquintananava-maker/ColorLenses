function Navbar({ setIsOpen }) {

  return (

    <nav className="navbar">

      <h1>ColorLenses</h1>

      <button
        className="menu-btn"

        onClick={() => setIsOpen(true)}
      >
        ☰
      </button>

    </nav>
  );
}

export default Navbar;