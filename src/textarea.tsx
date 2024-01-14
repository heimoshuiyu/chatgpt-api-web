export const autoHeight = (event: any) => {
  event.target.style.height = "auto";
  // max 70% of screen height
  event.target.style.height = `${Math.min(
    event.target.scrollHeight,
    window.innerHeight * 0.7
  )}px`;
};
