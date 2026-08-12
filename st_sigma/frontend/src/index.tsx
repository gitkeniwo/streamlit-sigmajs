import type { FrontendRenderer, FrontendState } from "@streamlit/component-v2-lib"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import InteractiveGraph from "./components/InteractiveGraph"
import type { StreamlitComponentArgs } from "./utils/types"
import "./App.css"

const renderSigmaGraph: FrontendRenderer<FrontendState, StreamlitComponentArgs> = ({
  data,
  parentElement,
}) => {
  const mountElement = document.createElement("div")
  mountElement.className = "sigma-component-root"
  parentElement.appendChild(mountElement)

  const root = createRoot(mountElement)
  root.render(
    <StrictMode>
      <InteractiveGraph args={data} />
    </StrictMode>,
  )

  return () => {
    root.unmount()
    mountElement.remove()
  }
}

export default renderSigmaGraph
