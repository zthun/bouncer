import {
  ZBannerMain,
  ZFashionThemeContext,
  ZNotFound,
  ZRoute,
  ZRouteMap,
} from "@zthun/fashion-boutique";
import theme from "@zthun/fashion-theme-dark";

import { ZBouncerHome } from "../home/home.js";
import { ZBouncerAvatar } from "./app-avatar.js";
import { ZBouncerTitle } from "./app-title.js";

export function ZBouncerApp() {
  return (
    <ZFashionThemeContext value={theme}>
      <ZBannerMain
        TitleProps={{
          avatar: <ZBouncerAvatar />,
          prefix: <ZBouncerTitle />,
        }}
      >
        <ZRouteMap>
          <ZRoute path="" element={<ZBouncerHome />} />
          <ZRoute path="*" element={<ZNotFound />} />
        </ZRouteMap>
      </ZBannerMain>
    </ZFashionThemeContext>
  );
}
