import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../lib/api";
import { Send, User, Brain, GraduationCap, Sparkles, Pill, FlaskConical } from "lucide-react-native";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    metrics?: {
        medications?: string[];
        lab_tests?: string[];
    };
    isStreaming?: boolean;
}

export default function LearnScreen() {
    const { user } = useAuth();
    const firstName = user?.full_name?.split(" ")[0] || "Doctor";

    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content: `Hello Dr. ${firstName}. I am your Expert Learning Assistant.\n\nI can retrieve clinical insights from past cases in our hospital (and globally) to help with your current diagnosis.\n\n**Ask me about:**\n• Identifying rare symptoms\n• Treatment protocols for specific conditions\n• Past experiences with similar cases`,
        }
    ]);
    const [query, setQuery] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [useStrictFilter, setUseStrictFilter] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("");
    const scrollRef = useRef<ScrollView>(null);

    const categories = [
        { value: "", label: "All" },
        { value: "General", label: "General" },
        { value: "Cardiology", label: "Cardiology" },
        { value: "Dermatology", label: "Dermatology" },
        { value: "Pediatrics", label: "Pediatrics" },
        { value: "Neurology", label: "Neurology" },
        { value: "Orthopedics", label: "Orthopedics" },
        { value: "Internal Medicine", label: "Internal Med" },
    ];

    useEffect(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    const handleSubmit = async () => {
        const text = query.trim();
        if (!text || isStreaming) return;

        setQuery("");
        setIsStreaming(true);

        const userMsgId = Date.now().toString();
        const botMsgId = (Date.now() + 1).toString();

        setMessages(prev => [
            ...prev,
            { id: userMsgId, role: "user", content: text },
            { id: botMsgId, role: "assistant", content: "", isStreaming: true },
        ]);

        try {
            const token = await AsyncStorage.getItem("lh_token");
            const baseURL = api.defaults.baseURL || "http://192.168.29.67:8000/api/v1";

            const payload: any = {
                query: text,
                category: selectedCategory || null,
            };
            if (useStrictFilter) {
                payload.hospital_id = user?.hospital_id;
            }

            const response = await fetch(`${baseURL}/agent/expert-chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(response.status === 403
                    ? "Access Denied. Please ensure you have the correct permissions."
                    : "Failed to fetch response");
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No reader available");

            const decoder = new TextDecoder();
            let accumulatedContent = "";
            let accumulatedMetrics: { medications: string[]; lab_tests: string[] } = { medications: [], lab_tests: [] };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const dataStr = line.replace("data: ", "").trim();
                        if (dataStr === "[DONE]") break;

                        try {
                            const parsed = JSON.parse(dataStr);

                            if (parsed.type === "token") {
                                accumulatedContent += parsed.content;
                                setMessages(prev => prev.map(msg =>
                                    msg.id === botMsgId
                                        ? { ...msg, content: accumulatedContent }
                                        : msg
                                ));
                            } else if (parsed.type === "metadata") {
                                accumulatedMetrics = {
                                    medications: parsed.medications || [],
                                    lab_tests: parsed.lab_tests || [],
                                };
                                setMessages(prev => prev.map(msg =>
                                    msg.id === botMsgId
                                        ? { ...msg, metrics: accumulatedMetrics }
                                        : msg
                                ));
                            }
                        } catch { }
                    }
                }
            }
        } catch (error: any) {
            setMessages(prev => prev.map(msg =>
                msg.id === botMsgId
                    ? { ...msg, content: `**Error:** ${error.message || "Failed to retrieve expert insights."}` }
                    : msg
            ));
        } finally {
            setIsStreaming(false);
            setMessages(prev => prev.map(msg =>
                msg.id === botMsgId ? { ...msg, isStreaming: false } : msg
            ));
        }
    };

    const formatBold = (content: string) => {
        return content.split("**").map((part, i) =>
            i % 2 === 1
                ? <Text key={i} className="font-bold text-gray-900">{part}</Text>
                : <Text key={i}>{part}</Text>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
            {/* Header */}
            <View className="px-5 py-3 border-b border-gray-200 bg-white" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 }}>
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                        <View className="w-10 h-10 rounded-2xl items-center justify-center" style={{ backgroundColor: '#F0FDFA' }}>
                            <GraduationCap size={20} color="#0D9488" />
                        </View>
                        <View>
                            <Text className="text-gray-900 font-bold text-lg">Expert Learn</Text>
                            <Text className="text-gray-400 text-xs">Collective medical intelligence</Text>
                        </View>
                    </View>
                    <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#CCFBF1' }}>
                        <Sparkles size={11} color="#0D9488" />
                        <Text className="text-xs font-medium" style={{ color: '#0D9488', fontSize: 10 }}>MedVQA & Pinecone</Text>
                    </View>
                </View>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1" keyboardVerticalOffset={90}>
                {/* Messages */}
                <ScrollView
                    ref={scrollRef}
                    className="flex-1 px-4 pt-4"
                    contentContainerStyle={{ paddingBottom: 16 }}
                >
                    {messages.map((msg) => (
                        <View key={msg.id} className={`mb-4 flex-row ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            {msg.role === "assistant" && (
                                <View className="w-9 h-9 rounded-full items-center justify-center mr-2.5 mt-1" style={{ backgroundColor: '#F0FDFA' }}>
                                    <Brain size={18} color="#0D9488" />
                                </View>
                            )}

                            <View className={`flex max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                                <View
                                    className={`rounded-2xl px-4 py-3 ${msg.role === "user"
                                        ? "rounded-tr-sm"
                                        : "rounded-tl-sm"
                                        }`}
                                    style={msg.role === "user"
                                        ? { backgroundColor: '#0D9488' }
                                        : { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 }
                                    }
                                >
                                    <Text className={`text-sm leading-5 ${msg.role === "user" ? "text-white" : "text-gray-700"}`}>
                                        {formatBold(msg.content)}
                                    </Text>
                                </View>

                                {/* Metadata pills */}
                                {msg.role === "assistant" && msg.metrics &&
                                    ((msg.metrics.medications?.length || 0) > 0 || (msg.metrics.lab_tests?.length || 0) > 0) && (
                                        <View className="flex-row flex-wrap gap-1.5 mt-2 ml-1">
                                            {msg.metrics.medications?.map((med, i) => (
                                                <View key={`med-${i}`} className="flex-row items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#DBEAFE' }}>
                                                    <Pill size={10} color="#3B82F6" />
                                                    <Text className="font-medium" style={{ color: '#3B82F6', fontSize: 10 }}>{med}</Text>
                                                </View>
                                            ))}
                                            {msg.metrics.lab_tests?.map((lab, i) => (
                                                <View key={`lab-${i}`} className="flex-row items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#D1FAE5' }}>
                                                    <FlaskConical size={10} color="#10B981" />
                                                    <Text className="font-medium" style={{ color: '#10B981', fontSize: 10 }}>{lab}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                <Text style={{ fontSize: 10, marginTop: 4, paddingHorizontal: 4 }} className="text-gray-400">
                                    {msg.role === "assistant" && msg.isStreaming ? (
                                        <Text style={{ color: '#0D9488' }}>Thinking...</Text>
                                    ) : msg.role === "user" ? "You" : "Expert AI"}
                                </Text>
                            </View>

                            {msg.role === "user" && (
                                <View className="w-9 h-9 rounded-full items-center justify-center ml-2.5 mt-1" style={{ backgroundColor: '#F0FDFA' }}>
                                    <User size={18} color="#0D9488" />
                                </View>
                            )}
                        </View>
                    ))}
                </ScrollView>

                {/* Input Area */}
                <View className="px-4 pb-3 pt-2 border-t border-gray-200 bg-white">
                    {/* Filters */}
                    <View className="flex-row items-center gap-2 mb-2">
                        <TouchableOpacity
                            onPress={() => setUseStrictFilter(!useStrictFilter)}
                            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border"
                            style={useStrictFilter
                                ? { backgroundColor: '#0D9488', borderColor: '#0D9488' }
                                : { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }
                            }
                        >
                            {useStrictFilter && <View className="w-1.5 h-1.5 bg-white rounded-full" />}
                            <Text className="text-xs font-medium" style={{ color: useStrictFilter ? '#FFFFFF' : '#6B7280' }}>
                                My Hospital
                            </Text>
                        </TouchableOpacity>

                        {useStrictFilter && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {categories.map(cat => (
                                    <TouchableOpacity
                                        key={cat.value}
                                        onPress={() => setSelectedCategory(cat.value)}
                                        className="px-2.5 py-1 rounded-md mr-1.5 border"
                                        style={selectedCategory === cat.value
                                            ? { backgroundColor: '#F0FDFA', borderColor: '#CCFBF1' }
                                            : { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }
                                        }
                                    >
                                        <Text className="font-medium" style={{ fontSize: 10, color: selectedCategory === cat.value ? '#0D9488' : '#9CA3AF' }}>
                                            {cat.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}
                    </View>

                    <View className="flex-row items-end gap-2">
                        <View className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-1">
                            <TextInput
                                className="text-gray-900 text-base py-2.5 max-h-24"
                                placeholder="Ask about a case, symptom, or treatment..."
                                placeholderTextColor="#9CA3AF"
                                value={query}
                                onChangeText={setQuery}
                                multiline
                                editable={!isStreaming}
                            />
                        </View>
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={!query.trim() || isStreaming}
                            className="w-12 h-12 rounded-2xl items-center justify-center"
                            style={{ backgroundColor: query.trim() && !isStreaming ? '#0D9488' : '#E5E7EB' }}
                        >
                            {isStreaming
                                ? <ActivityIndicator size="small" color="#0D9488" />
                                : <Send size={18} color={query.trim() ? "white" : "#9CA3AF"} />
                            }
                        </TouchableOpacity>
                    </View>
                    <Text className="text-center mt-2" style={{ fontSize: 9, color: '#9CA3AF' }}>
                        AI can make mistakes. Please verify important medical information.
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
