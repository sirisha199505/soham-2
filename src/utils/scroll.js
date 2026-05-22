// Dashboard pages scroll inside <main id="main-content">.
// Full-screen pages (LevelContent, LevelQuiz, auth) scroll the window.
// Pass smooth=false for instant jumps (route changes), smooth=true for in-page nav.
export function scrollToTop(smooth = true) {
  const behavior = smooth ? 'smooth' : 'instant';
  const main = document.getElementById('main-content');
  if (main) {
    main.scrollTo({ top: 0, behavior });
  } else {
    window.scrollTo({ top: 0, behavior });
  }
}
