import { ZCard, ZIconFontAwesome } from "@zthun/fashion-boutique";
import { ZSizeFixed, ZSizeVaried } from "@zthun/fashion-tailor";

export function ZBouncerHome() {
  return (
    <ZCard
      className="ZBouncerHome-root"
      width={ZSizeVaried.Full}
      TitleProps={{
        heading: "Bouncer",
        subHeading: "Easy Reverse Proxy",
        avatar: <ZIconFontAwesome name="server" width={ZSizeFixed.Medium} />,
      }}
    >
      TODO
    </ZCard>
  );
}
