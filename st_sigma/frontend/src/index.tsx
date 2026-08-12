import type { FrontendRenderer, FrontendState } from "@streamlit/component-v2-lib"
import { StrictMode } from "react"
import { createRoot, type Root } from "react-dom/client"
import InteractiveGraph from "./components/InteractiveGraph"
import type { StreamlitComponentArgs } from "./utils/types"
import "./App.css"

interface MountedComponent {
  element: HTMLDivElement
  root: Root
  generation: number
}

const mountedComponents = new WeakMap<HTMLElement | ShadowRoot, MountedComponent>()

const renderSigmaGraph: FrontendRenderer<FrontendState, StreamlitComponentArgs> = ({
  data,
  parentElement,
}) => {
  let mounted = mountedComponents.get(parentElement)
  if (!mounted) {
    const element = document.createElement("div")
    element.className = "sigma-component-root"
    parentElement.appendChild(element)
    mounted = { element, root: createRoot(element), generation: 0 }
    mountedComponents.set(parentElement, mounted)
  }
  mounted.generation += 1
  const generation = mounted.generation

  mounted.root.render(
    <StrictMode>
      <InteractiveGraph args={data} />
    </StrictMode>,
  )

  return () => {
    const current = mountedComponents.get(parentElement)
    if (current !== mounted || current.generation !== generation) return
    mounted.root.unmount()
    mounted.element.remove()
    mountedComponents.delete(parentElement)
  }
}

export default renderSigmaGraph
