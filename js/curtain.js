document.addEventListener('DOMContentLoaded', () => {
  const curtainSection = document.querySelector("#hvh-curtain-section");
  const leftCurtain = document.querySelector(".curtain-left");
  const rightCurtain = document.querySelector(".curtain-right");
  if (curtainSection && leftCurtain && rightCurtain) {
    setTimeout(() => {
      leftCurtain.style.transform = "translateX(-100%)";
      rightCurtain.style.transform = "translateX(100%)";
    }, 500);
  }
});