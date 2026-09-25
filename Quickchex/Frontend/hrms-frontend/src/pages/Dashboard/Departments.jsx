import { useState } from "react";
import Sidebar from "../../components/sidebar/Sidebar";

const Departments = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ display: "flex" }}>
      <Sidebar expanded={expanded} setExpanded={setExpanded} />
      <div style={{ marginLeft: expanded ? 240 : 80, padding: "20px" }}>
        <h2>Departments Page</h2>
      </div>
    </div>
  );
};

export default Departments;