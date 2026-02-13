import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AuthTabs, Ripple, TechOrbitDisplay } from "@/components/ui/modern-animated-sign-in";
import { Brain, Code, FileText, Briefcase, Zap, Search, Layout, Database, Terminal } from "lucide-react";

// Icons for the orbit display
const iconsArray = [
  {
    component: () => <Brain className="h-8 w-8 text-primary" />,
    className: 'size-[50px] border-none bg-transparent',
    radius: 90,
    duration: 20,
    path: false,
    reverse: false,
  },
  {
    component: () => <Code className="h-6 w-6 text-blue-500" />,
    className: 'size-[40px] border-none bg-transparent',
    radius: 140,
    duration: 20,
    delay: 20,
    path: false,
    reverse: true,
  },
  {
    component: () => <FileText className="h-10 w-10 text-amber-500" />,
    className: 'size-[60px] border-none bg-transparent',
    radius: 200,
    duration: 25,
    delay: 10,
    path: false,
    reverse: false,
  },
  {
    component: () => <Briefcase className="h-6 w-6 text-emerald-500" />,
    className: 'size-[40px] border-none bg-transparent',
    radius: 140,
    duration: 20,
    delay: 40,
    path: false,
    reverse: true,
  },
  {
    component: () => <Zap className="h-5 w-5 text-yellow-500" />,
    className: 'size-[30px] border-none bg-transparent',
    radius: 90,
    duration: 20,
    delay: 60,
    path: false,
    reverse: false,
  },
  {
    component: () => <Search className="h-8 w-8 text-purple-500" />,
    className: 'size-[50px] border-none bg-transparent',
    radius: 260,
    duration: 30,
    delay: 0,
    path: false,
    reverse: true,
  },
  {
    component: () => <Layout className="h-6 w-6 text-pink-500" />,
    className: 'size-[40px] border-none bg-transparent',
    radius: 200,
    duration: 25,
    delay: 50,
    path: false,
    reverse: false,
  },
  {
    component: () => <Database className="h-7 w-7 text-cyan-500" />,
    className: 'size-[45px] border-none bg-transparent',
    radius: 260,
    duration: 30,
    delay: 30,
    path: false,
    reverse: true,
  }
];

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
  });
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (user) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(formData.email, formData.password);
      if (error) {
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
      } else {
        navigate("/dashboard");
      }
    } else {
      const { error } = await signUp(formData.email, formData.password, formData.fullName);
      if (error) {
        toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Check your email", description: "We sent you a verification link." });
      }
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        title: "Google login failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const toggleAuthMode = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsLogin(!isLogin);
  };

  const formFields = {
    header: isLogin ? "Welcome Back" : "Create Account",
    subHeader: isLogin ? "Sign in to continue your career journey" : "Start your AI-powered career preparation",
    fields: [
      ...(!isLogin ? [{
        label: "Full Name",
        required: true,
        type: "text" as const,
        placeholder: "John Doe",
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(e, "fullName"),
      }] : []),
      {
        label: "Email",
        required: true,
        type: "email" as const,
        placeholder: "you@example.com",
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(e, "email"),
      },
      {
        label: "Password",
        required: true,
        type: "password" as const,
        placeholder: "••••••••",
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(e, "password"),
      },
    ],
    submitButton: loading ? "Please wait..." : (isLogin ? "Sign In" : "Sign Up"),
    textVariantButton: isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In",
    googleLogin: "Continue with Google",
  };

  return (
    <section className='flex min-h-screen max-lg:justify-center overflow-hidden bg-background'>
      {/* Left Side - Animated Visualization */}
      <span className='flex flex-col justify-center w-1/2 max-lg:hidden relative border-r border-border/50 bg-muted/10'>
        {/* Background Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

        <Ripple mainCircleSize={150} numCircles={8} className="opacity-60" />
        <TechOrbitDisplay
          iconsArray={iconsArray}
          text="HireSense AI"
        />
      </span>

      {/* Right Side - Auth Form */}
      <span className='w-1/2 max-lg:w-full max-lg:px-6 flex flex-col justify-center items-center relative'>
        <div className="absolute top-8 right-8">
          {/* Optional: Add theme toggle or similar here */}
        </div>

        <AuthTabs
          formFields={formFields}
          goTo={toggleAuthMode}
          handleSubmit={handleSubmit}
          onGoogleLogin={handleGoogleLogin}
        />
      </span>
    </section>
  );
};

export default Auth;
