import React, { useState } from "react";
import {
    motion,
    AnimatePresence,
    useMotionValue,
    useTransform,
} from "framer-motion";
import {
    Mail,
    Lock,
    Eye,
    EyeClosed,
    ArrowRight,
} from "lucide-react";
import { cn } from "./lib/utils";

function Input({
    className,
    type,
    ...props
}: React.ComponentProps<"input">) {
    return (
        <input
            type={type}
            data-slot="input"
            className={cn(
                "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
                className
            )}
            {...props}
        />
    );
}

type LoginProps = {
    onLogin: () => void;
};

export function Component({ onLogin }: LoginProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const [focusedInput, setFocusedInput] = useState<
        "email" | "password" | null
    >(null);

    // Hackathon demo credentials
    const VALID_EMAIL = "quantumcoders@gmail.com";
    const VALID_PASSWORD = "1234";

    // 3D card effect
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
    const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);

    const handleMouseMove = (
        e: React.MouseEvent<HTMLDivElement>
    ) => {
        const rect = e.currentTarget.getBoundingClientRect();

        mouseX.set(e.clientX - rect.left - rect.width / 2);
        mouseY.set(e.clientY - rect.top - rect.height / 2);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    const handleSubmit = (
        e: React.FormEvent<HTMLFormElement>
    ) => {
        e.preventDefault();

        setError("");
        setIsLoading(true);

        setTimeout(() => {
            if (
                email.trim().toLowerCase() ===
                VALID_EMAIL.toLowerCase() &&
                password === VALID_PASSWORD
            ) {
                setIsLoading(false);
                onLogin();
            } else {
                setIsLoading(false);
                setError("Invalid email or password");
            }
        }, 800);
    };

    return (
        <div className="min-h-screen w-full relative overflow-hidden flex items-center">

            {/* Right side AI Knowledge Assistant image */}
            <motion.div
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: 0.2 }}
                className="absolute right-[16%] top-1/2 -translate-y-1/2 w-[52%] z-0 flex items-center justify-center"
            >
                <img
                    src="/knowledge-ai.png"
                    alt="Quanta AI"
                    className="w-full h-auto object-contain scale-125"
                />
            </motion.div>

            {/* Login card wrapper */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-xl relative z-10 ml-[8%] my-10"
                style={{ perspective: 1500 }}
            >
                <motion.div
                    className="relative"
                    style={{ rotateX, rotateY }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    whileHover={{ z: 10 }}
                >
                    <div className="relative group">

                        {/* Card glow */}
                        <motion.div
                            className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-70 transition-opacity duration-700"
                            animate={{
                                boxShadow: [
                                    "0 0 10px 2px rgba(255,255,255,0.03)",
                                    "0 0 15px 5px rgba(255,255,255,0.05)",
                                    "0 0 10px 2px rgba(255,255,255,0.03)",
                                ],
                                opacity: [0.2, 0.4, 0.2],
                            }}
                            transition={{
                                duration: 4,
                                repeat: Infinity,
                                ease: "easeInOut",
                                repeatType: "mirror",
                            }}
                        />

                        {/* Traveling border lights */}
                        <div className="absolute -inset-[1px] rounded-2xl overflow-hidden">

                            <motion.div
                                className="absolute top-0 left-0 h-[3px] w-[50%] bg-gradient-to-r from-transparent via-white to-transparent opacity-70"
                                initial={{ filter: "blur(2px)" }}
                                animate={{
                                    left: ["-50%", "100%"],
                                    opacity: [0.3, 0.7, 0.3],
                                    filter: [
                                        "blur(1px)",
                                        "blur(2.5px)",
                                        "blur(1px)",
                                    ],
                                }}
                                transition={{
                                    left: {
                                        duration: 2.5,
                                        ease: "easeInOut",
                                        repeat: Infinity,
                                        repeatDelay: 1,
                                    },
                                    opacity: {
                                        duration: 1.2,
                                        repeat: Infinity,
                                        repeatType: "mirror",
                                    },
                                    filter: {
                                        duration: 1.5,
                                        repeat: Infinity,
                                        repeatType: "mirror",
                                    },
                                }}
                            />

                            <motion.div
                                className="absolute top-0 right-0 h-[50%] w-[3px] bg-gradient-to-b from-transparent via-white to-transparent opacity-70"
                                animate={{
                                    top: ["-50%", "100%"],
                                    opacity: [0.3, 0.7, 0.3],
                                }}
                                transition={{
                                    top: {
                                        duration: 2.5,
                                        ease: "easeInOut",
                                        repeat: Infinity,
                                        repeatDelay: 1,
                                        delay: 0.6,
                                    },
                                    opacity: {
                                        duration: 1.2,
                                        repeat: Infinity,
                                        repeatType: "mirror",
                                        delay: 0.6,
                                    },
                                }}
                            />

                            <motion.div
                                className="absolute bottom-0 right-0 h-[3px] w-[50%] bg-gradient-to-r from-transparent via-white to-transparent opacity-70"
                                animate={{
                                    right: ["-50%", "100%"],
                                    opacity: [0.3, 0.7, 0.3],
                                }}
                                transition={{
                                    right: {
                                        duration: 2.5,
                                        ease: "easeInOut",
                                        repeat: Infinity,
                                        repeatDelay: 1,
                                        delay: 1.2,
                                    },
                                    opacity: {
                                        duration: 1.2,
                                        repeat: Infinity,
                                        repeatType: "mirror",
                                        delay: 1.2,
                                    },
                                }}
                            />

                            <motion.div
                                className="absolute bottom-0 left-0 h-[50%] w-[3px] bg-gradient-to-b from-transparent via-white to-transparent opacity-70"
                                animate={{
                                    bottom: ["-50%", "100%"],
                                    opacity: [0.3, 0.7, 0.3],
                                }}
                                transition={{
                                    bottom: {
                                        duration: 2.5,
                                        ease: "easeInOut",
                                        repeat: Infinity,
                                        repeatDelay: 1,
                                        delay: 1.8,
                                    },
                                    opacity: {
                                        duration: 1.2,
                                        repeat: Infinity,
                                        repeatType: "mirror",
                                        delay: 1.8,
                                    },
                                }}
                            />
                        </div>

                        {/* Main card */}
                        <div className="relative min-h-[560px] flex flex-col justify-center bg-black/40 backdrop-blur-xl rounded-2xl px-10 py-12 border border-white/[0.05] shadow-2xl overflow-hidden">

                            {/* Inner pattern */}
                            <div
                                className="absolute inset-0 opacity-[0.03]"
                                style={{
                                    backgroundImage:
                                        "linear-gradient(135deg, white 0.5px, transparent 0.5px), linear-gradient(45deg, white 0.5px, transparent 0.5px)",
                                    backgroundSize: "30px 30px",
                                }}
                            />

                            {/* Header */}
                            <div className="relative text-center space-y-2 mb-7 -mt-20">

                                <div className="overflow-hidden -mt-8 mb-8">
                                    <motion.h2
                                        initial={{
                                            opacity: 0,
                                            y: 30,
                                            backgroundPosition: "0% center",
                                        }}
                                        animate={{
                                            opacity: 1,
                                            y: 0,
                                            backgroundPosition: ["0% center", "200% center"],
                                        }}
                                        transition={{
                                            opacity: {
                                                duration: 0.8,
                                                delay: 0.15,
                                            },
                                            y: {
                                                duration: 0.8,
                                                delay: 0.15,
                                                ease: "easeOut",
                                            },
                                            backgroundPosition: {
                                                duration: 3,
                                                repeat: Infinity,
                                                ease: "linear",
                                            },
                                        }}
                                        className="text-3xl font-bold tracking-[0.15em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-white via-emerald-300 to-emerald-400 bg-[length:200%_auto]"
                                    >
                                        Quanta AI
                                    </motion.h2>
                                </div>

                                <motion.h1
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        duration: 0.6,
                                        delay: 0.45,
                                    }}
                                    className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80"
                                >
                                    Welcome Back
                                </motion.h1>

                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.55 }}
                                    className="text-white/60 text-sm"
                                >
                                    Sign in to access your knowledge base
                                </motion.p>

                            </div>

                            {/* Form */}
                            <form
                                onSubmit={handleSubmit}
                                className="relative space-y-4"
                            >
                                {/* Email */}
                                <motion.div
                                    className={`relative ${focusedInput === "email" ? "z-10" : ""
                                        }`}
                                    whileHover={{ scale: 1.01 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 400,
                                        damping: 25,
                                    }}
                                >
                                    <div className="relative flex items-center overflow-hidden rounded-lg">

                                        <Mail
                                            className={`absolute left-3 w-4 h-4 transition-all duration-300 ${focusedInput === "email"
                                                ? "text-white"
                                                : "text-white/40"
                                                }`}
                                        />

                                        <Input
                                            type="email"
                                            placeholder="Email address"
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                setError("");
                                            }}
                                            onFocus={() =>
                                                setFocusedInput("email")
                                            }
                                            onBlur={() =>
                                                setFocusedInput(null)
                                            }
                                            className="w-full bg-white/5 border-transparent focus:border-white/20 text-white placeholder:text-white/30 h-11 transition-all duration-300 pl-10 pr-3 focus:bg-white/10"
                                        />

                                        {focusedInput === "email" && (
                                            <motion.div
                                                layoutId="input-highlight"
                                                className="absolute inset-0 bg-white/5 -z-10"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                            />
                                        )}
                                    </div>
                                </motion.div>

                                {/* Password */}
                                <motion.div
                                    className={`relative ${focusedInput === "password"
                                        ? "z-10"
                                        : ""
                                        }`}
                                    whileHover={{ scale: 1.01 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 400,
                                        damping: 25,
                                    }}
                                >
                                    <div className="relative flex items-center overflow-hidden rounded-lg">

                                        <Lock
                                            className={`absolute left-3 w-4 h-4 transition-all duration-300 ${focusedInput === "password"
                                                ? "text-white"
                                                : "text-white/40"
                                                }`}
                                        />

                                        <Input
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            placeholder="Password"
                                            value={password}
                                            onChange={(e) => {
                                                setPassword(e.target.value);
                                                setError("");
                                            }}
                                            onFocus={() =>
                                                setFocusedInput("password")
                                            }
                                            onBlur={() =>
                                                setFocusedInput(null)
                                            }
                                            className="w-full bg-white/5 border-transparent focus:border-white/20 text-white placeholder:text-white/30 h-11 transition-all duration-300 pl-10 pr-10 focus:bg-white/10"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword(!showPassword)
                                            }
                                            className="absolute right-3 cursor-pointer"
                                        >
                                            {showPassword ? (
                                                <Eye className="w-4 h-4 text-white/40 hover:text-white transition-colors duration-300" />
                                            ) : (
                                                <EyeClosed className="w-4 h-4 text-white/40 hover:text-white transition-colors duration-300" />
                                            )}
                                        </button>

                                        {focusedInput === "password" && (
                                            <motion.div
                                                layoutId="input-highlight"
                                                className="absolute inset-0 bg-white/5 -z-10"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                            />
                                        )}
                                    </div>
                                </motion.div>

                                {/* Error */}
                                <AnimatePresence>
                                    {error && (
                                        <motion.p
                                            initial={{
                                                opacity: 0,
                                                y: -5,
                                            }}
                                            animate={{
                                                opacity: 1,
                                                y: 0,
                                            }}
                                            exit={{
                                                opacity: 0,
                                                y: -5,
                                            }}
                                            className="text-red-400 text-xs text-center"
                                        >
                                            {error}
                                        </motion.p>
                                    )}
                                </AnimatePresence>

                                {/* Sign in */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full relative group/button mt-6"
                                >
                                    <div className="absolute inset-0 bg-white/10 rounded-lg blur-lg opacity-0 group-hover/button:opacity-70 transition-opacity duration-300" />

                                    <div className="relative overflow-hidden bg-white text-black font-medium h-11 rounded-lg transition-all duration-300 flex items-center justify-center">

                                        <AnimatePresence mode="wait">
                                            {isLoading ? (
                                                <motion.div
                                                    key="loading"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="flex items-center justify-center"
                                                >
                                                    <div className="w-4 h-4 border-2 border-black/70 border-t-transparent rounded-full animate-spin" />
                                                </motion.div>
                                            ) : (
                                                <motion.span
                                                    key="button-text"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="flex items-center justify-center gap-2 text-sm font-medium"
                                                >
                                                    Sign In

                                                    <ArrowRight className="w-4 h-4 group-hover/button:translate-x-1 transition-transform duration-300" />
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.button>
                            </form>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </div >
    );
}