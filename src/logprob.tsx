import React from "react";

const logprobToColor = (logprob: number) => {
  // 将logprob转换为百分比
  const percent = Math.exp(logprob) * 100;

  // 计算颜色值
  // 绿色的RGB值为(0, 255, 0)，红色的RGB值为(255, 0, 0)
  const red = Math.round(255 * (1 - percent / 100));
  const green = Math.round(255 * (percent / 100));
  const color = `rgb(${red}, ${green}, 0)`;

  return color;
};

export default logprobToColor;
