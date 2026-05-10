import { Composition } from "remotion"

import { MainComposition } from "./Composition"
import { MemflowUpdateVideo } from "./MemflowUpdateVideo"

import "./style.css"

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MemflowPromo"
        component={MainComposition}
        durationInFrames={810}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="MemflowUpdate"
        component={MemflowUpdateVideo}
        durationInFrames={3390}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  )
}
