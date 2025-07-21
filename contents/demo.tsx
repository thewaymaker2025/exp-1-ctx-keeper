import styleText from "data-text:./style.module.css"

import type {
  PlasmoCSConfig,
  PlasmoGetStyle
} from "~node_modules/plasmo/dist/type"

export const config: PlasmoCSConfig = {
  matches: ["https://chatgpt.com/c/*", "https://chatgpt.com/g/*"],
  all_frames: true
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = styleText
  return style
}

export default function DemoComponent() {
  return <div id="demo-container">{/* <h1>Demo Component UI</h1> */}</div>
}
