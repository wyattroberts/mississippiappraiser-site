export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="/" aria-label="Mississippi Appraiser home">
          <img
            src="/wp-content/uploads/2019/12/mississippi_appraiser_transparent_background-1.png"
            alt="Mississippi Appraiser"
          />
        </a>
        <nav className="primary-nav" aria-label="Primary navigation">
          <a href="/service-area/">Service area</a>
          <a href="/blog/">Appraiser blog</a>
          <a href="/contact/">Contact</a>
          <a className="nav-call" href="tel:+16017063391">Call (601) 706-3391</a>
        </nav>
      </div>
    </header>
  );
}

