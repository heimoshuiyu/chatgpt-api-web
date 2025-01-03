export const autoHeight = (target: any) => {
  target.style.height = "auto";
  // max 70% of screen height
  target.style.height = `${Math.min(
    target.scrollHeight,
    window.innerHeight * 0.7
  )}px`;
  console.log("set auto height", target.style.height);
};
