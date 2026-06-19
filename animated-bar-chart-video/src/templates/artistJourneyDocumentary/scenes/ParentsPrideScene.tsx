import { ChapterTitle, DocumentaryBackdrop, SafeDocStage, documentary } from "../components/DocumentaryElements";
import type { ArtistJourneyDocumentaryPayload } from "../schema";

export const ParentsPrideScene: React.FC<{ payload: ArtistJourneyDocumentaryPayload }> = ({ payload }) => {
  const quote = payload.parentsQuote?.text || "За каждым выходом на сцену - годы поддержки семьи.";
  const author = payload.parentsQuote?.author || "Семья";

  return (
    <DocumentaryBackdrop mountainIntensity={0.52} lightSide="left" fogTop={840}>
      <SafeDocStage style={{ justifyContent: "center" }}>
        <ChapterTitle eyebrow="гордость родителей" title="То, что видно сердцем" delay={4} size={58} />
        <div
          style={{
            marginTop: 72,
            paddingLeft: 34,
            borderLeft: `4px solid ${documentary.gold}`,
            color: documentary.cream,
            fontSize: 55,
            lineHeight: 1.08,
            fontWeight: 760,
            textWrap: "balance",
          }}
        >
          «{quote}»
        </div>
        <div style={{ color: documentary.muted, fontSize: 28, fontWeight: 680, marginTop: 34 }}>{author}</div>
      </SafeDocStage>
    </DocumentaryBackdrop>
  );
};
