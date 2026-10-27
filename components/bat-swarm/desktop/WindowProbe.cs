using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Diagnostics;

// No window titles, document text, files or input content are collected.
// Only public window geometry, z order, foreground client rect and cursor position.
class WindowProbe {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int left, top, right, bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int x,y; }
  delegate bool EnumProc(IntPtr hwnd, IntPtr param);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc cb,IntPtr param);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr hwnd);
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr hwnd,out RECT rc);
  [DllImport("user32.dll")] static extern bool GetClientRect(IntPtr hwnd,out RECT rc);
  [DllImport("user32.dll")] static extern bool ClientToScreen(IntPtr hwnd, ref POINT p);
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern bool GetCursorPos(out POINT p);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
  [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr v);
  [DllImport("user32.dll")] static extern int GetClassName(IntPtr h,StringBuilder text,int n);
  [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h,int index);
  [DllImport("user32.dll")] static extern bool GetLayeredWindowAttributes(IntPtr h,out uint key,out byte alpha,out uint flags);
  [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h,int a,out RECT rc,int cb);
  [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h,int a,out int v,int cb);
  static string RectJson(RECT r) {return "["+r.left+","+r.top+","+r.right+","+r.bottom+"]";}
  static void Main(string[] args) {
    uint ignore=uint.Parse(args[0]);
    try {SetThreadDpiAwarenessContext(new IntPtr(-4));}catch(EntryPointNotFoundException){}
    Console.OutputEncoding=new UTF8Encoding(false);
    while(true) {
      try { if(Process.GetProcessById((int)ignore).HasExited)return; }catch{return;}
      var rows=new List<string>();
      EnumWindows((h,p)=>{
        uint pid; GetWindowThreadProcessId(h,out pid);
        if(pid==ignore||!IsWindowVisible(h)||IsIconic(h))return true;
        int exStyle=GetWindowLong(h,-20);
        // Click-through overlays are transparent to perches as well as clicks.
        if((exStyle&0x20)!=0)return true;
        uint key,flags;byte alpha;
        if((exStyle&0x80000)!=0&&GetLayeredWindowAttributes(h,out key,out alpha,out flags)&&(flags&2)!=0&&alpha<16)return true;
        // Full-screen Qt screenshot/annotation tools use a per-pixel transparent
        // tool surface. It is not a solid occluder, even without WS_EX_TRANSPARENT.
        var classBuf=new StringBuilder(256);GetClassName(h,classBuf,256);
        if((exStyle&0x80080)==0x80080&&classBuf.ToString().StartsWith("Qt")&&classBuf.ToString().Contains("Tool"))return true;
        int cloaked;DwmGetWindowAttribute(h,14,out cloaked,4);if(cloaked!=0)return true;
        var cls=new StringBuilder(256);GetClassName(h,cls,256);var name=cls.ToString();
        if(name=="Progman"||name=="WorkerW"||name=="Shell_TrayWnd"||name=="Shell_SecondaryTrayWnd")return true;
        RECT rc;if(DwmGetWindowAttribute(h,9,out rc,16)!=0)GetWindowRect(h,out rc);
        if(rc.right-rc.left<60||rc.bottom-rc.top<30)return true;
        // Tool windows may occlude other edges, but should not become perches.
        bool perch=(exStyle&0x80)==0;
        rows.Add("{\"id\":\""+h.ToInt64()+"\",\"class\":\""+name.Replace("\\","\\\\").Replace("\"","\\\"")+"\",\"style\":"+exStyle+",\"r\":"+RectJson(rc)+",\"perch\":"+(perch?"true":"false")+"}");return true;
      },IntPtr.Zero);
      POINT cur;GetCursorPos(out cur);RECT fg;var hwnd=GetForegroundWindow();GetClientRect(hwnd,out fg);
      POINT origin=new POINT();ClientToScreen(hwnd,ref origin);fg.right+=origin.x;fg.bottom+=origin.y;fg.left=origin.x;fg.top=origin.y;
      try {Console.WriteLine("{\"windows\":["+string.Join(",",rows)+"],\"cursor\":["+cur.x+","+cur.y+"],\"foreground\":"+RectJson(fg)+"}");Console.Out.Flush();}catch{return;}
      Thread.Sleep(100);
    }
  }
}
