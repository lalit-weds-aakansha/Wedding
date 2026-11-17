import { useEffect, useState } from "react";
import { GardenScene } from "./GardenScene";
import { BlushScene, CarnivalScene, MandapScene, NightScene } from "./EventScenes";
import { StoryDefs } from "./art";
import { SceneDefs } from "../scene/Landscape";
import { H } from "../scene/geometry";

/** Development helper: /?scenePreview=garden shows one scene full screen. Not used in production builds. */
export default function Preview({ name }: { name: string }) {
  const [asp, setAsp] = useState(window.innerWidth / window.innerHeight);
  useEffect(() => { const on = () => setAsp(window.innerWidth / window.innerHeight); window.addEventListener("resize", on); return () => window.removeEventListener("resize", on); }, []);
  const W = Math.round(Math.min(3400, Math.max(780, H * asp)) / 40) * 40;
  return (
    <div className="fixed inset-0 overflow-hidden bg-[#bcd9ee]">
      <SceneDefs /><StoryDefs />
      {name === "garden" && <GardenScene W={W} />}
      {name === "blush" && <BlushScene W={W} />}
      {name === "night" && <NightScene W={W} />}
      {name === "carnival" && <CarnivalScene W={W} />}
      {name === "mandap" && <MandapScene W={W} />}
    </div>
  );
}
