export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <p className="footer-title">Mississippi Appraiser</p>
          <p>Commercial real estate appraisal and consulting across Mississippi.</p>
        </div>
        <div>
          <p className="footer-label">Reach us</p>
          <a href="tel:+16019514280">(601) 951-4280</a>
          <a href="mailto:wyatt@wyattopia.com">wyatt@wyattopia.com</a>
        </div>
        <div>
          <p className="footer-label">Mailing address</p>
          <p>P.O. Box 1094<br />Florence, MS 39073</p>
        </div>
      </div>
      <div className="footer-bottom">© {new Date().getFullYear()} Mississippi Appraiser · Wyatt Roberts, MAI</div>
    </footer>
  );
}

