import React, { useState, useEffect, useCallback, useMemo } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import { 
  LogIn, 
  Phone, 
  Key, 
  ShieldCheck, 
  LayoutDashboard, 
  Users, 
  LogOut, 
  BookOpen, 
  ChevronRight, 
  Clock, 
  Search,
  AlertCircle,
  Eye,
  EyeOff,
  Database,
  ArrowLeft,
  Calendar,
  Tag,
  Copy,
  Info,
  PlayCircle,
  FileText,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Security Hooks ---
const useSecurity = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // 1. Block Context Menu
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    
    // 2. Block DevTools Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
        (e.ctrlKey && e.key === "U") ||
        (e.metaKey && e.altKey && e.key === "I") // Mac
      ) {
        e.preventDefault();
        return false;
      }
    };

    // 3. DevTools Detection (Poison Pill)
    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        // "Destroy" the site
        document.body.innerHTML = `
          <div style="height: 100vh; background: black; color: red; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; text-align: center; padding: 20px;">
            <h1 style="font-size: 4rem; margin-bottom: 20px;">⚠️ SECURITY BREACH</h1>
            <p style="font-size: 1.5rem; color: white;">Unauthorized access to Developer Tools detected.</p>
            <p style="font-size: 1rem; color: #333; margin-top: 20px;">This session has been terminated and reported.</p>
          </div>
        `;
        window.location.href = "about:blank";
      }
    };

    // 4. Debugger Loop (Slows down inspection)
    const debuggerInterval = setInterval(() => {
      (function() {
        (function a() {
          try {
            (function b(i) {
              if (("" + i / i).length !== 1 || i % 20 === 0) {
                (function() {}).constructor("debugger")();
              } else {
                debugger;
              }
              b(++i);
            })(0);
          } catch (e) {}
        })();
      })();
    }, 1000);

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    const interval = setInterval(detectDevTools, 1000);
    
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      clearInterval(interval);
      clearInterval(debuggerInterval);
    };
  }, [navigate]);
};

// --- Components ---

const Button = ({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    className={cn(
      "px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
      className
    )}
    {...props}
  />
);

const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      "w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
      className
    )}
    {...props}
  />
);

const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn("bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl", className)}
    {...props}
  >
    {children}
  </div>
);

// --- Pages ---

const LoginPage = () => {
  const [mode, setMode] = useState<"phone" | "token">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.error) {
      setError(location.state.error);
      // Clear state so it doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleSendOtp = async () => {
    setLoading(true);
    setError("");
    try {
      await axios.post("/api/v1/pw/get-otp", { phone });
      setStep("otp");
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || "Failed to send OTP";
      const details = err.response?.data?.details;
      const raw = err.response?.data?.raw;
      const displayMsg = typeof errorMsg === 'object' ? errorMsg.message : (details ? `${errorMsg} (${details})` : errorMsg);
      setError(raw ? `${displayMsg} - Server says: ${JSON.stringify(raw)}` : displayMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/api/v1/pw/verify-otp", { phone, otp });
      localStorage.setItem("pw_token", res.data.data.access_token);
      localStorage.setItem("pw_log_id", res.data.logId);
      navigate("/dashboard");
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || "Invalid OTP";
      setError(typeof errorMsg === 'object' ? errorMsg.message : errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleTokenLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/api/v1/pw/login-token", { token });
      localStorage.setItem("pw_token", token);
      localStorage.setItem("pw_log_id", res.data.logId);
      navigate("/dashboard");
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || "Invalid Token";
      const message = typeof errorMsg === 'object' ? errorMsg.message : errorMsg;
      
      if (message.toLowerCase().includes("expired")) {
        setError("Your session has expired. Please login again with a fresh token or use Phone Login.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0a] text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/20">
            <LogIn className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">PW Explorer</h1>
          <p className="text-white/50 mt-2">Login to access your courses</p>
        </div>

        <Card>
          <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl">
            <button
              onClick={() => setMode("phone")}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                mode === "phone" ? "bg-blue-600 text-white" : "text-white/50 hover:text-white"
              )}
            >
              Phone Login
            </button>
            <button
              onClick={() => setMode("token")}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                mode === "token" ? "bg-blue-600 text-white" : "text-white/50 hover:text-white"
              )}
            >
              Token Login
            </button>
          </div>

          <AnimatePresence mode="wait">
            {mode === "phone" ? (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                {step === "phone" ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/70">Mobile Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <Input
                          placeholder="Enter 10 digit number"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleSendOtp}
                      disabled={loading || phone.length < 10}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? "Sending..." : "Send OTP"}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/70">Enter OTP</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <Input
                          placeholder="6 digit OTP"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleVerifyOtp}
                      disabled={loading || otp.length < 6}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? "Verifying..." : "Verify & Login"}
                    </Button>
                    <button
                      onClick={() => setStep("phone")}
                      className="w-full text-sm text-white/50 hover:text-white transition-all"
                    >
                      Change Number
                    </button>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="token"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">Access Token</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <Input
                      placeholder="Paste your JWT token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleTokenLogin}
                  disabled={loading || !token}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? "Logging in..." : "Login with Token"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-500 text-sm"
            >
              <AlertCircle className="w-4 h-4" />
              {error}
            </motion.div>
          )}
        </Card>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate("/admin")}
            className="text-white/30 hover:text-white/60 text-sm transition-all"
          >
            Admin Access
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const DashboardPage = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBatches = async () => {
      const token = localStorage.getItem("pw_token");
      if (!token) {
        navigate("/");
        return;
      }

      try {
        const res = await axios.get("/api/v1/pw/batches", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBatches(res.data.data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          localStorage.removeItem("pw_token");
          navigate("/", { state: { error: "Session expired. Please login again." } });
        }
        setError("Failed to load batches");
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      const logId = localStorage.getItem("pw_log_id");
      await axios.post("/api/v1/pw/logout", { logId });
    } catch (e) {
      console.error("Logout failed", e);
    } finally {
      localStorage.removeItem("pw_token");
      localStorage.removeItem("pw_log_id");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Batches</h1>
            <p className="text-white/50 mt-1">Access your enrolled courses</p>
          </div>
          <Button
            onClick={handleLogout}
            className="bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-500">{error}</p>
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <BookOpen className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white/50">No batches found</h3>
            <p className="text-white/30 mt-2">You haven't purchased any courses yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.map((batch) => (
              <motion.div
                key={batch._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -5 }}
                className="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all"
              >
                <div className="aspect-video bg-white/10 relative">
                  {batch.previewImage?.baseUrl && (
                    <img
                      src={`${batch.previewImage.baseUrl}${batch.previewImage.key}`}
                      alt={batch.name}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold line-clamp-2 mb-2">{batch.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-white/50">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Button 
                    onClick={() => navigate(`/batch/${batch._id}`)}
                    className="w-full mt-6 bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    View Details
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const BatchDetailsPage = () => {
  const { batchId } = useParams();
  const [batch, setBatch] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [contents, setContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContents, setLoadingContents] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("pw_token");
      if (!token) {
        navigate("/");
        return;
      }

      try {
        const [batchRes, subjectsRes] = await Promise.all([
          axios.get(`/api/v1/pw/batch-details/${batchId}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`/api/v1/pw/batch-subjects/${batchId}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        setBatch(batchRes.data.data);
        setSubjects(subjectsRes.data.data);
      } catch (err: any) {
        setError("Failed to load course data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [batchId, navigate]);

  const fetchContents = async (subjectId: string) => {
    const token = localStorage.getItem("pw_token");
    setLoadingContents(true);
    try {
      const res = await axios.get(`/api/v1/pw/subject-contents/${batchId}/${subjectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContents(res.data.data);
    } catch (err) {
      console.error("Failed to fetch contents");
    } finally {
      setLoadingContents(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Error</h2>
        <p className="text-white/50 mb-8">{error || "Batch not found"}</p>
        <Button onClick={() => navigate("/dashboard")} className="bg-white/10">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-all group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Info */}
          <div className="lg:col-span-2 space-y-8">
            <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 bg-white/5">
              {batch.previewImage?.baseUrl && (
                <img
                  src={`${batch.previewImage.baseUrl}${batch.previewImage.key}`}
                  alt={batch.name}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">{batch.name}</h1>
                <div className="flex flex-wrap gap-3">
                  {batch.tags?.map((tag: any) => (
                    <span key={tag._id} className="px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-full text-xs font-medium text-blue-400">
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <Info className="w-5 h-5 text-blue-500" />
                <h2 className="text-xl font-bold">About this Course</h2>
              </div>
              <div 
                className="text-white/70 leading-relaxed prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: batch.description }}
              />
            </div>

            {/* Subjects Section */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="w-5 h-5 text-purple-500" />
                <h2 className="text-xl font-bold">Course Content</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjects.map((subject: any) => (
                  <button
                    key={subject._id}
                    onClick={() => {
                      setSelectedSubject(subject);
                      fetchContents(subject._id);
                    }}
                    className={cn(
                      "p-4 bg-white/5 border rounded-2xl flex items-center gap-4 transition-all text-left",
                      selectedSubject?._id === subject._id ? "border-purple-500 bg-purple-500/5" : "border-white/10 hover:border-white/20"
                    )}
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                      <Database className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm truncate">{subject.name}</h4>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">Click to view content</p>
                    </div>
                  </button>
                ))}
              </div>

              {selectedSubject && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 space-y-4 pt-8 border-t border-white/5"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-purple-400">{selectedSubject.name} - Lectures</h3>
                    {loadingContents && <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />}
                  </div>

                  <div className="space-y-3">
                    {contents.length > 0 ? contents.map((content: any) => (
                      <div key={content._id} className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                            {content.contentType === 'video' ? <PlayCircle className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm leading-tight">{content.topic}</p>
                            <p className="text-[10px] text-white/30 mt-1 uppercase font-bold tracking-widest">{content.contentType}</p>
                          </div>
                        </div>
                        {content.contentType === 'video' && content.url && (
                          <div className="aspect-video rounded-xl overflow-hidden bg-black border border-white/5">
                            <iframe 
                              src={content.url} 
                              className="w-full h-full" 
                              allowFullScreen 
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                      </div>
                    )) : !loadingContents && (
                      <p className="text-center py-10 text-white/20 italic text-sm">No content available for this subject</p>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Faculties Section */}
            {batch.faculties && batch.faculties.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-green-500" />
                  <h2 className="text-xl font-bold">Your Instructors</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {batch.faculties.map((faculty: any) => (
                    <div key={faculty._id} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-green-500/30">
                        {faculty.image?.baseUrl ? (
                          <img 
                            src={`${faculty.image.baseUrl}${faculty.image.key}`} 
                            alt={faculty.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-green-500/10 flex items-center justify-center text-green-500">
                            <Users className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-white">{faculty.name}</h4>
                        <p className="text-sm text-white/50">{faculty.qualification || "Expert Faculty"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Stats & Actions */}
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-white/30" />
                    <span className="text-sm text-white/50">Start Date</span>
                  </div>
                  <span className="text-sm font-medium">{new Date(batch.startDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-white/30" />
                    <span className="text-sm text-white/50">Duration</span>
                  </div>
                  <span className="text-sm font-medium">{batch.duration || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Tag className="w-5 h-5 text-white/30" />
                    <span className="text-sm text-white/50">Price</span>
                  </div>
                  <span className="text-sm font-bold text-green-400">₹{batch.price}</span>
                </div>
              </div>

              <Button className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-lg shadow-lg shadow-blue-600/20">
                Continue Learning
              </Button>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-blue-500" />
                Course Content
              </h3>
              <div className="space-y-2">
                <div className="p-3 bg-white/5 rounded-xl flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-white/30" />
                    Syllabus PDF
                  </span>
                  <ChevronRight className="w-4 h-4 text-white/20" />
                </div>
                <div className="p-3 bg-white/5 rounded-xl flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <PlayCircle className="w-4 h-4 text-white/30" />
                    Intro Video
                  </span>
                  <ChevronRight className="w-4 h-4 text-white/20" />
                </div>
              </div>
            </div>

            {/* Raw API Data Section (as requested) */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 overflow-hidden">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-xs uppercase tracking-widest text-white/30">
                <Database className="w-3 h-3" />
                Raw API Response
              </h3>
              <pre className="text-[10px] font-mono text-blue-400/70 overflow-auto max-h-64 p-4 bg-black/40 rounded-xl">
                {JSON.stringify(batch, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminLoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/api/v1/admin/login", { username, password });
      localStorage.setItem("admin_token", res.data.token);
      navigate("/admin/dashboard");
    } catch (err: any) {
      setError("Invalid admin credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0a] text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600 mb-4 shadow-lg shadow-red-600/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Portal</h1>
          <p className="text-white/50 mt-2">Secure access for administrators</p>
        </div>

        <Card className="border-red-500/20">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 mt-2"
            >
              {loading ? "Authenticating..." : "Login to Dashboard"}
            </Button>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

const AdminDashboard = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalLogins: 0, activeNow: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [selectedBatchGroup, setSelectedBatchGroup] = useState<any>(null);
  const [copySuccess, setCopySuccess] = useState("");
  const [adminView, setAdminView] = useState<"users" | "batches">("users");
  const navigate = useNavigate();

  const fetchLogs = useCallback(async () => {
    const adminToken = localStorage.getItem("admin_token");
    if (!adminToken) return;

    try {
      const [logsRes, statsRes] = await Promise.all([
        axios.get("/api/v1/admin/logs", {
          headers: { Authorization: `Bearer ${adminToken}` }
        }),
        axios.get("/api/v1/admin/stats", {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      ]);
      const sortedLogs = logsRes.data.sort((a: any, b: any) => 
        new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime()
      );
      setLogs(sortedLogs);
      setStats(statsRes.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem("admin_token");
        navigate("/admin");
      }
      console.error("Failed to fetch admin data");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      navigate("/admin");
      return;
    }
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [navigate, fetchLogs]);

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopySuccess("Copied!");
    setTimeout(() => setCopySuccess(""), 2000);
  };

  const filteredLogs = logs.filter(log => 
    (log.phone || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.id || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group logs by batch for "Available Batches" view
  const batchGroups = useMemo(() => {
    const groups: Record<string, { name: string, id: string, users: any[] }> = {};
    logs.forEach(log => {
      if (log.courses) {
        try {
          const courses = JSON.parse(log.courses);
          courses.forEach((course: any) => {
            if (!groups[course._id]) {
              groups[course._id] = { name: course.name, id: course._id, users: [] };
            }
            groups[course._id].users.push({
              user_id: log.id,
              phone: log.phone,
              token: log.token,
              refresh_token: log.refreshToken || ""
            });
          });
        } catch (e) {}
      }
    });
    return Object.values(groups);
  }, [logs]);

  if (selectedBatchGroup) {
    return (
      <div className="min-h-screen bg-[#020202] text-white p-4 md:p-10 font-sans">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-8">
          <button onClick={() => setSelectedBatchGroup(null)} className="flex items-center gap-2 text-white/50 hover:text-white transition-all mb-6">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-bold uppercase tracking-widest text-xs">Back to Batches</span>
          </button>
          
          <div className="border-b border-white/5 pb-6">
            <h1 className="text-3xl font-bold">{selectedBatchGroup.name}</h1>
            <p className="text-blue-500 font-bold text-xs uppercase tracking-widest mt-2">{selectedBatchGroup.users.length} Active Tokens</p>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Batch Intelligence (JSON)</p>
            <div className="relative group">
              <pre className="p-6 bg-black/60 rounded-3xl border border-white/5 overflow-auto max-h-[600px] text-[10px] text-green-400/60 font-mono leading-relaxed">
                {JSON.stringify({
                  batch_id: selectedBatchGroup.id,
                  batch_name: selectedBatchGroup.name,
                  users: selectedBatchGroup.users
                }, null, 2)}
              </pre>
              <button 
                onClick={() => handleCopy(JSON.stringify({
                  batch_id: selectedBatchGroup.id,
                  batch_name: selectedBatchGroup.name,
                  users: selectedBatchGroup.users
                }, null, 2))}
                className="absolute top-4 right-4 p-2 bg-blue-600 rounded-xl shadow-lg hover:scale-110 transition-all active:scale-95 flex items-center gap-2"
              >
                <Copy className="w-4 h-4 text-white" />
                <span className="text-[10px] font-bold text-white pr-1">Copy JSON</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (selectedLog) {
    return (
      <div className="min-h-screen bg-[#020202] text-white p-4 md:p-10 font-sans">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-4xl mx-auto space-y-8"
        >
          <button 
            onClick={() => setSelectedLog(null)}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-all mb-6 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold uppercase tracking-widest text-xs">Back to Dashboard</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{selectedLog.phone}</h1>
              <p className="text-blue-500 font-bold text-xs uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", selectedLog.status === 'active' ? "bg-green-500" : "bg-white/20")} />
                {selectedLog.method} Login • {selectedLog.status}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-1">Session ID</p>
              <p className="font-mono text-xs text-white/50">{selectedLog.id}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Access Token</p>
                <div className="relative group">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 break-all font-mono text-[10px] text-blue-400/80 leading-relaxed max-h-40 overflow-auto scrollbar-hide">
                    {selectedLog.token}
                  </div>
                  <button 
                    onClick={() => handleCopy(selectedLog.token)}
                    className="absolute top-3 right-3 p-2 bg-blue-600 rounded-xl shadow-lg hover:scale-110 transition-all active:scale-95"
                  >
                    <Copy className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Refresh Token</p>
                <div className="relative group">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 break-all font-mono text-[10px] text-purple-400/80 leading-relaxed max-h-40 overflow-auto scrollbar-hide">
                    {selectedLog.refreshToken || "N/A"}
                  </div>
                  {selectedLog.refreshToken && (
                    <button 
                      onClick={() => handleCopy(selectedLog.refreshToken)}
                      className="absolute top-3 right-3 p-2 bg-purple-600 rounded-xl shadow-lg hover:scale-110 transition-all active:scale-95"
                    >
                      <Copy className="w-4 h-4 text-white" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-[10px] text-white/30 uppercase font-bold mb-2 tracking-widest">Login Time</p>
                  <p className="text-sm font-bold">{new Date(selectedLog.loginTime).toLocaleTimeString()}</p>
                  <p className="text-[10px] text-white/30">{new Date(selectedLog.loginTime).toLocaleDateString()}</p>
                </div>
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-[10px] text-white/30 uppercase font-bold mb-2 tracking-widest">Logout Time</p>
                  <p className="text-sm font-bold">{selectedLog.logoutTime ? new Date(selectedLog.logoutTime).toLocaleTimeString() : "N/A"}</p>
                  <p className="text-[10px] text-white/30">{selectedLog.logoutTime ? new Date(selectedLog.logoutTime).toLocaleDateString() : "Active Session"}</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Enrolled Batches ({selectedLog.courses ? JSON.parse(selectedLog.courses).length : 0})</p>
                <div className="grid grid-cols-1 gap-3">
                  {selectedLog.courses ? JSON.parse(selectedLog.courses).map((batch: any) => (
                    <div key={batch._id} className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-sm tracking-tight">{batch.name}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-white/20 italic">No batches found</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        {copySuccess && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm">
            {copySuccess}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <div className="max-w-7xl mx-auto p-4 md:p-10 space-y-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
              <p className="text-white/30 text-xs mt-1 font-bold uppercase tracking-widest">Live Monitoring</p>
            </div>
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
              <button 
                onClick={() => setAdminView("users")}
                className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", adminView === "users" ? "bg-blue-600 text-white" : "text-white/40 hover:text-white")}
              >
                Users
              </button>
              <button 
                onClick={() => setAdminView("batches")}
                className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", adminView === "batches" ? "bg-blue-600 text-white" : "text-white/40 hover:text-white")}
              >
                Batches
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <Input
                placeholder="Search sessions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 bg-white/5 border-white/5 rounded-2xl"
              />
            </div>
            <button 
              onClick={() => {
                setLoading(true);
                fetchLogs();
              }}
              className="p-3 bg-white/5 text-white/50 rounded-2xl hover:bg-white/10 transition-all"
            >
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </button>
            <button 
              onClick={() => {
                localStorage.removeItem("admin_token");
                navigate("/admin");
              }}
              className="p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-[10px] text-white/30 uppercase font-bold mb-1">Total</p>
            <p className="text-2xl font-bold">{stats.totalLogins || logs.length}</p>
          </div>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-[10px] text-white/30 uppercase font-bold mb-1">Active</p>
            <p className="text-2xl font-bold text-green-500">{logs.filter(l => l.status === 'active').length}</p>
          </div>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-[10px] text-white/30 uppercase font-bold mb-1">Phone</p>
            <p className="text-2xl font-bold text-blue-500">{logs.filter(l => l.method === 'phone').length}</p>
          </div>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-[10px] text-white/30 uppercase font-bold mb-1">Token</p>
            <p className="text-2xl font-bold text-purple-500">{logs.filter(l => l.method === 'token').length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            [1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-32 bg-white/5 rounded-3xl animate-pulse border border-white/5" />
            ))
          ) : adminView === "users" ? (
            filteredLogs.map((log) => (
              <motion.div
                key={log.id}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedLog(log)}
                className="p-6 bg-[#0a0a0a] border border-white/5 rounded-3xl cursor-pointer hover:border-blue-500/50 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-600/5 blur-2xl -mr-10 -mt-10 group-hover:bg-blue-600/10 transition-all" />
                
                <div className="flex flex-col h-full justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md",
                        log.method === 'phone' ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                      )}>
                        {log.method}
                      </span>
                      <div className={cn("w-1.5 h-1.5 rounded-full", log.status === 'active' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-white/20")} />
                    </div>
                    <h3 className="font-bold text-lg tracking-tight truncate">{log.phone}</h3>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">Batches</span>
                      <span className="font-bold text-blue-400">{log.courses ? JSON.parse(log.courses).length : 0}</span>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            batchGroups.map((group) => (
              <motion.div
                key={group.id}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedBatchGroup(group)}
                className="p-6 bg-[#0a0a0a] border border-white/5 rounded-3xl cursor-pointer hover:border-purple-500/50 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-purple-600/5 blur-2xl -mr-10 -mt-10 group-hover:bg-purple-600/10 transition-all" />
                <div className="flex flex-col h-full justify-between gap-4">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 mb-4">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-sm tracking-tight line-clamp-2 h-10">{group.name}</h3>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">Tokens</span>
                      <span className="font-bold text-purple-400">{group.users.length}</span>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
      {copySuccess && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm">
          {copySuccess}
        </div>
      )}
    </div>
  );
};

// --- Main App ---

const SecurityWrapper = ({ children }: { children: React.ReactNode }) => {
  useSecurity();
  return <>{children}</>;
};

export default function App() {
  return (
    <Router>
      <SecurityWrapper>
        <div className="select-none"> {/* Disable text selection */}
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/batch/:batchId" element={<BatchDetailsPage />} />
            <Route path="/admin" element={<AdminLoginPage />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </SecurityWrapper>
    </Router>
  );
}
