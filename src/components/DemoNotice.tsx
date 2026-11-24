import { cookies } from "next/headers";
import { getLocale } from "@/lib/locale-server";

export default async function DemoNotice() {
  const on = (await cookies()).get("sd_notice")?.value === "readonly";
  if (!on) return null;
  const locale = await getLocale();
  return (
    <div role="status" style={{ background: "#fff4de", color: "#7a4a06", borderBottom: "1px solid #f1d9a6", padding: "10px 18px", fontSize: 14, textAlign: "center" }}>
      {locale === "ar"
        ? "هذا العرض المستضاف للقراءة فقط: لا يمكن حفظ التغييرات هنا. شغّل المشروع محليًا (الخطوات في README) لتجربة إنشاء التذاكر والرد عليها."
        : "This hosted demo is read-only, so changes are not saved here. Run the project locally (steps in the README) to create tickets, reply and edit content."}
    </div>
  );
}
