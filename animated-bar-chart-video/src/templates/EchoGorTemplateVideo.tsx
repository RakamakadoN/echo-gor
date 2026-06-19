import { AbsoluteFill, Img, Series } from "remotion";
import {
  BrandMark,
  MediaMosaic,
  MetricsGrid,
  OrnamentLine,
  SafeStage,
  SceneChrome,
  StageBackdrop,
  TitleBlock,
  theme,
} from "../components/EchoGorVisuals";
import type { EchoGorVideoPayload, VideoScene } from "../data/videoTypes";

const renderScene = (scene: VideoScene, payload: EchoGorVideoPayload) => {
  const metrics = scene.metrics?.length ? scene.metrics : payload.metrics || [];

  if (scene.kind === "metrics") {
    return (
      <SceneChrome branchName={payload.brand.branchName}>
        <TitleBlock eyebrow={payload.brand.schoolName} title={scene.title} subtitle={scene.subtitle} />
        <OrnamentLine />
        <MetricsGrid metrics={metrics} />
      </SceneChrome>
    );
  }

  if (scene.kind === "montage") {
    return (
      <SceneChrome branchName={payload.brand.branchName}>
        <TitleBlock eyebrow={payload.title} title={scene.title} subtitle={scene.body || payload.subtitle} />
        <OrnamentLine />
        <MediaMosaic scene={{ ...scene, media: scene.media || payload.media }} />
      </SceneChrome>
    );
  }

  if (scene.kind === "quote") {
    return (
      <SceneChrome branchName={payload.brand.branchName}>
        <div style={{ maxWidth: 1080 }}>
          <div style={{ color: theme.gold, fontSize: 34, fontWeight: 760, marginBottom: 38 }}>Слова наставника</div>
          <div style={{ color: theme.cream, fontSize: 68, lineHeight: 1.08, fontWeight: 760, textWrap: "balance" }}>
            «{payload.quote?.text || scene.body}»
          </div>
          <div style={{ color: theme.muted, fontSize: 30, marginTop: 42, fontWeight: 650 }}>
            {payload.quote?.author || payload.people?.teacher?.name || "Эхо Гор"}
          </div>
        </div>
      </SceneChrome>
    );
  }

  if (scene.kind === "portrait") {
    const person = payload.people?.student || payload.people?.teacher;
    return (
      <SceneChrome branchName={payload.brand.branchName}>
        <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 62, alignItems: "center" }}>
          <div
            style={{
              height: 620,
              border: "1px solid rgba(214,174,85,0.34)",
              background: "linear-gradient(145deg, rgba(214,174,85,0.20), rgba(75,17,25,0.35))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: theme.gold,
              fontSize: 46,
              fontWeight: 820,
              textAlign: "center",
              padding: 40,
            }}
          >
            {person?.photoUrl ? (
              <Img src={person.photoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              person?.name || payload.entity.name
            )}
          </div>
          <div>
            <TitleBlock eyebrow={payload.brand.schoolName} title={scene.title} subtitle={payload.subtitle} />
            <OrnamentLine />
            <MetricsGrid metrics={metrics.slice(0, 3)} />
          </div>
        </div>
      </SceneChrome>
    );
  }

  if (scene.kind === "cta") {
    return (
      <AbsoluteFill>
        <StageBackdrop intensity={1.25} />
        <SafeStage>
          <div style={{ maxWidth: 1120 }}>
            <TitleBlock
              eyebrow={payload.callToAction?.detail || payload.brand.city}
              title={payload.callToAction?.label || scene.title}
              subtitle={scene.body || payload.subtitle}
            />
          </div>
        </SafeStage>
        <BrandMark branchName={payload.brand.branchName} />
      </AbsoluteFill>
    );
  }

  return (
    <SceneChrome branchName={payload.brand.branchName}>
      <TitleBlock eyebrow={payload.brand.schoolName} title={scene.title || payload.title} subtitle={payload.subtitle} />
      <OrnamentLine />
      {metrics.length ? <MetricsGrid metrics={metrics.slice(0, 3)} /> : null}
    </SceneChrome>
  );
};

export type EchoGorTemplateVideoProps = {
  payload: EchoGorVideoPayload;
};

export const EchoGorTemplateVideo: React.FC<EchoGorTemplateVideoProps> = ({ payload }) => {
  return (
    <AbsoluteFill style={{ background: theme.black }}>
      <Series>
        {payload.scenes.map((scene) => (
          <Series.Sequence key={scene.id} durationInFrames={scene.durationInFrames} premountFor={payload.fps}>
            {renderScene(scene, payload)}
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};
