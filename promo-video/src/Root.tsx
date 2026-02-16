import { Composition } from 'remotion';
import { MainComposition } from './Composition';
import './style.css';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MemflowPromo"
        component={MainComposition}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
