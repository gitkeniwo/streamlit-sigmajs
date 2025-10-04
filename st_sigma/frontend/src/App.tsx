import React from 'react';
import InteractiveGraph from "./components/InteractiveGraph"
import { withStreamlitConnection } from "streamlit-component-lib"
import "./App.css"

const WSCInteractiveGraph = withStreamlitConnection(InteractiveGraph)

function App() {
    return (
        <div className="App">
            <WSCInteractiveGraph />
        </div>
    );
}

export default App;