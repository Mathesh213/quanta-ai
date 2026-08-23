import { useState } from "react";
import Velaris from "./Velaris";
import { Component as Login } from "./Login";
import KnowledgeAssistant from "./KnowledgeAssistant";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <>
      {isLoggedIn ? (
        <KnowledgeAssistant onLogout={() => setIsLoggedIn(false)} />
      ) : (
        <Velaris
          height="100vh"
          bg="#06110d"
          colors={[
            "#0b3d2e",
            "#146c4e",
            "#23845f",
            "#04100b",
          ]}
          speed={2}
          grain={0.18}
        >
          <Login onLogin={() => setIsLoggedIn(true)} />
        </Velaris>
      )}
    </>
  );
}

export default App;