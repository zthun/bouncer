import {
  ZBannerMain,
  ZFashionThemeContext,
  ZNotFound,
  ZRoute,
  ZRouteMap,
} from "@zthun/fashion-boutique";
import { createDarkTheme } from "@zthun/fashion-theme";
import { ZBouncerHome } from "../home/home.js";
import { ZBouncerAvatar } from "./app-avatar.js";
import { ZBouncerTitle } from "./app-title.js";

const FashionTheme = createDarkTheme();

export function ZBouncerApp() {
  return (
    <ZFashionThemeContext.Provider value={FashionTheme}>
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
    </ZFashionThemeContext.Provider>
  );
}
