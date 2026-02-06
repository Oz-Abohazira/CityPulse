import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import {
  MapPin,
  Shield,
  Footprints,
  Bus,
  ShoppingCart,
  Bike,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Store,
  Coffee,
  Dumbbell,
  Pill,
  Heart,
  ChevronRight,
  Plus,
  Scale,
  List,
  Map,
  Sparkles,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import POIMap, { CATEGORY_STYLES, DEFAULT_STYLE } from "@/components/POIMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { analyzeByAddress, analyzeByCoordinates, type WeightPresetName } from "@/api/client";
import type { LocationPulse, SafetyScore, VibeLabel, SearchIntent } from "@/types";
import { cn } from "@/lib/utils";

// -----------------------------------------------------------------------------
// Helper Components
// -----------------------------------------------------------------------------

function ScoreCircle({
  score,
  grade,
  size = "lg",
  colorClass,
}: {
  score: number;
  grade?: string;
  size?: "sm" | "md" | "lg";
  colorClass: string;
}) {
  const sizeClasses = {
    sm: "w-16 h-16 text-xl",
    md: "w-24 h-24 text-3xl",
    lg: "w-32 h-32 text-4xl",
  };

  return (
    <div
      className={cn(
        "relative rounded-full flex items-center justify-center",
        sizeClasses[size],
        colorClass
      )}
    >
      <div className="absolute inset-2 rounded-full bg-slate-900/50 flex flex-col items-center justify-center">
        {grade ? (
          <span className="font-bold text-white">{grade}</span>
        ) : (
          <span className="font-bold text-white">{score}</span>
        )}
      </div>
      <svg className="absolute inset-0 w-full h-full -rotate-90">
        <circle
          cx="50%"
          cy="50%"
          r="45%"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeDasharray={`${score * 2.83} 283`}
          className="opacity-80"
        />
      </svg>
    </div>
  );
}

function ScoreCard({
  title,
  score,
  description,
  icon: Icon,
  colorClass,
  bgColorClass,
  details,
}: {
  title: string;
  score: number;
  description: string;
  icon: React.ElementType;
  colorClass: string;
  bgColorClass: string;
  details?: React.ReactNode;
}) {
  return (
    <Card className="bg-white/5 backdrop-blur-sm border-white/10">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", bgColorClass)}>
            <Icon className={cn("h-6 w-6", colorClass)} />
          </div>
          <div className="text-right">
            <div className={cn("text-3xl font-bold", colorClass)}>{score}</div>
            <div className="text-xs text-white/50">/ 100</div>
          </div>
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm text-white/60 mb-4">{description}</p>
        <Progress value={score} className="h-2" />
        {details && <div className="mt-4">{details}</div>}
      </CardContent>
    </Card>
  );
}

function getVibeColor(label: VibeLabel): string {
  const colors: Record<VibeLabel, string> = {
    urban_oasis: "text-emerald-400",
    suburban_comfort: "text-blue-400",
    up_and_coming: "text-amber-400",
    car_country: "text-orange-400",
    hidden_gem: "text-purple-400",
    food_desert: "text-rose-400",
    transit_hub: "text-cyan-400",
    needs_attention: "text-red-400",
    balanced: "text-slate-400",
  };
  return colors[label] || "text-white";
}

function getVibeBgColor(label: VibeLabel): string {
  const colors: Record<VibeLabel, string> = {
    urban_oasis: "bg-emerald-500/20",
    suburban_comfort: "bg-blue-500/20",
    up_and_coming: "bg-amber-500/20",
    car_country: "bg-orange-500/20",
    hidden_gem: "bg-purple-500/20",
    food_desert: "bg-rose-500/20",
    transit_hub: "bg-cyan-500/20",
    needs_attention: "bg-red-500/20",
    balanced: "bg-slate-500/20",
  };
  return colors[label] || "bg-white/10";
}

function formatVibeLabel(label: VibeLabel): string {
  return label
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getGradeColor(grade: SafetyScore['grade']): string {
  if (grade === 'A') return "bg-gradient-to-br from-emerald-400 to-emerald-600";
  if (grade === 'B') return "bg-gradient-to-br from-blue-400 to-blue-600";
  if (grade === 'C') return "bg-gradient-to-br from-amber-400 to-amber-600";
  if (grade === 'D') return "bg-gradient-to-br from-orange-400 to-orange-600";
  return "bg-gradient-to-br from-rose-400 to-rose-600";
}

// Loading steps configuration
const LOADING_STEPS = [
  {
    text: "Locating address on map...",
    icon: MapPin,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
  },
  {
    text: "Fetching safety data from FBI sources...",
    icon: Shield,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  {
    text: "Analyzing nearby streets and walkways...",
    icon: Navigation,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
  },
  {
    text: "Finding transit options...",
    icon: Bus,
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
  },
  {
    text: "Discovering local amenities...",
    icon: ShoppingCart,
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
  },
  {
    text: "Calculating neighborhood vibe...",
    icon: Sparkles,
    color: "text-pink-400",
    bgColor: "bg-pink-500/20",
  },
];

function AnimatedLoadingStep({ step }: { step: typeof LOADING_STEPS[0] }) {
  const Icon = step.icon;
  return (
    <div className="flex items-center gap-3 animate-fade-in">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", step.bgColor)}>
        <Icon className={cn("h-5 w-5 animate-pulse", step.color)} />
      </div>
      <span className="text-white/70 text-sm">{step.text}</span>
    </div>
  );
}

function POIIcon({ category, color, size = "h-4 w-4" }: { category: string; color?: string; size?: string }) {
  const icons: Record<string, React.ElementType> = {
    grocery: Store,
    pharmacy: Pill,
    restaurant: Coffee,
    cafe: Coffee,
    gym: Dumbbell,
    healthcare: Heart,
    hospital: Heart,
    park: MapPin,
    transit: Bus,
    bank: Store,
    school: Store,
  };
  const Icon = icons[category] || Store;
  return <Icon className={size} style={color ? { color } : undefined} />;
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export default function PulseDashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [pulse, setPulse] = useState<LocationPulse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weightPreset] = useState<WeightPresetName>("balanced");
  const [maxDistance, setMaxDistance] = useState(2);
  const [viewMode, setViewMode] = useState<"list" | "map">("map");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);

  // Get params from URL
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const address = searchParams.get("address");
  const intent = searchParams.get("intent") as SearchIntent | null;

  // Cycle through loading steps - go through all steps once
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setLoadingStepIndex((prev) => {
        const next = prev + 1;
        // Loop back to start if we've gone through all steps
        if (next >= LOADING_STEPS.length) {
          return 0;
        }
        return next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    async function fetchPulse() {
      if (!lat && !lng && !address) {
        setError("No location specified");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      let response;

      if (lat && lng) {
        response = await analyzeByCoordinates(
          parseFloat(lat),
          parseFloat(lng),
          weightPreset,
          intent || undefined
        );
      } else if (address) {
        response = await analyzeByAddress(address, weightPreset, intent || undefined);
      }

      if (response?.success && response.data) {
        setPulse(response.data);
      } else {
        setError(response?.error?.message || "Failed to analyze location");
      }

      setIsLoading(false);
    }

    fetchPulse();
  }, [lat, lng, address, weightPreset, intent]);

  if (isLoading) {
    const currentStep = LOADING_STEPS[loadingStepIndex];
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-400 mx-auto mb-4" />
          <p className="text-white/70 mb-6">Analyzing neighborhood...</p>
          <div key={loadingStepIndex} className="animate-fade-in">
            <AnimatedLoadingStep step={currentStep} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !pulse) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center">
        <Card className="bg-white/10 border-white/20 max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Analysis Failed</h2>
            <p className="text-white/60 mb-6">{error || "Unable to analyze this location"}</p>
            <Button onClick={() => navigate("/")} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Try Another Location
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { location, safetyScore, mobilityScores, amenitiesScore, vibeScore, pois, dataSources } = pulse;

  // Base list: exclude transit, then apply distance filter from slider
  const allPois = ((pois as any[]) || []).filter((poi) => poi.category !== "transit");
  const displayPois = allPois.filter((poi) => (poi.distance || 0) <= maxDistance);
  const shownPois = filterCategory ? displayPois.filter((p: any) => p.category === filterCategory) : displayPois;

  // Handle POI selection from list
  const handlePoiClick = (poiId: string) => {
    setSelectedPoiId(poiId);
    setViewMode("map");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <img src="/city-pulse-logo.png" alt="CityPulse" className="h-9 w-9 rounded-lg" />
              <span className="text-xl font-semibold text-white">CityPulse</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={() => navigate("/")}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Search
            </Button>
            <Button
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              // onClick={() => navigate("/")}
            >
              <Scale className="mr-2 h-4 w-4" />
              Compare
            </Button>
          </div>
        </div>
      </header>

      {/* Location Header */}
      <div className="border-b border-white/10 bg-black/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Location Info */}
            <div>
              <div className="flex items-center gap-2 text-white/60 mb-2">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">{location.city}, {location.state} {location.zipCode}</span>
                {location.county && <span className="text-sm">({location.county} County)</span>}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 max-w-2xl truncate">
                {location.formattedAddress}
              </h1>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className={cn("text-white", getVibeBgColor(vibeScore.label))}>
                  {formatVibeLabel(vibeScore.label)}
                </Badge>
                <span className="text-white/50 text-sm">
                  Analyzed {new Date(pulse.analyzedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Overall Score */}
            <div className="flex items-center gap-6">
              <ScoreCircle
                score={vibeScore.overall}
                size="lg"
                colorClass={getGradeColor(safetyScore.grade)}
              />
              <div>
                <div className="text-white/60 text-sm mb-1">Overall Vibe</div>
                <div className={cn("text-2xl font-bold", getVibeColor(vibeScore.label))}>
                  {vibeScore.overall}/100
                </div>
                <div className="text-white/50 text-sm">
                  {vibeScore.confidence} confidence
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">

        {/* Vibe Summary */}
        <Card className="bg-white/5 backdrop-blur-sm border-white/10 mb-8">
          <CardContent className="p-6">
            <p className="text-white/80 text-lg leading-relaxed">{vibeScore.summary}</p>
            <div className="mt-6 grid md:grid-cols-2 gap-4">
              {/* Pros */}
              <div>
                <h4 className="text-emerald-400 font-medium mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Highlights
                </h4>
                <ul className="space-y-2">
                  {vibeScore.pros.map((pro, i) => (
                    <li key={i} className="text-white/70 text-sm flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Cons */}
              <div>
                <h4 className="text-amber-400 font-medium mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Considerations
                </h4>
                <ul className="space-y-2">
                  {vibeScore.cons.map((con, i) => (
                    <li key={i} className="text-white/70 text-sm flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <ScoreCard
            title="Safety"
            score={safetyScore.overall}
            description={`Grade ${safetyScore.grade} - ${safetyScore.riskLevel} risk`}
            icon={Shield}
            colorClass="text-emerald-400"
            bgColorClass="bg-emerald-500/20"
            details={
              <div className="text-xs text-white/50">
                {safetyScore.vsNational < 0 ? (
                  <span className="text-emerald-400">{Math.abs(safetyScore.vsNational)}% below national avg</span>
                ) : safetyScore.vsNational > 0 ? (
                  <span className="text-rose-400">{safetyScore.vsNational}% above national avg</span>
                ) : (
                  <span>At national average</span>
                )}
              </div>
            }
          />
          <ScoreCard
            title="Walkability"
            score={mobilityScores.walkScore.score}
            description={mobilityScores.walkScore.description}
            icon={Footprints}
            colorClass="text-blue-400"
            bgColorClass="bg-blue-500/20"
          />
          <ScoreCard
            title="Transit"
            score={mobilityScores.transitScore.score}
            description={mobilityScores.transitScore.description}
            icon={Bus}
            colorClass="text-purple-400"
            bgColorClass="bg-purple-500/20"
          />
          <ScoreCard
            title="Amenities"
            score={amenitiesScore.overall}
            description={amenitiesScore.isFoodDesert ? "Food desert detected" : "Good access to essentials"}
            icon={ShoppingCart}
            colorClass={amenitiesScore.isFoodDesert ? "text-rose-400" : "text-amber-400"}
            bgColorClass={amenitiesScore.isFoodDesert ? "bg-rose-500/20" : "bg-amber-500/20"}
          />
        </div>

        {/* Detailed Tabs */}
        <Tabs defaultValue="amenities" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="amenities" className="data-[state=active]:bg-white/10">Nearby Places</TabsTrigger>
            <TabsTrigger value="safety" className="data-[state=active]:bg-white/10">Safety Details</TabsTrigger>
            <TabsTrigger value="mobility" className="data-[state=active]:bg-white/10">Mobility</TabsTrigger>
          </TabsList>

          {/* Safety Tab */}
          <TabsContent value="safety">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-400" />
                  Crime Statistics (County Level)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">{safetyScore.crimeRates.total.toFixed(0)}</div>
                    <div className="text-xs text-white/50">Total Crime Rate</div>
                    <div className="text-xs text-white/40">per 100k people</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-2xl font-bold text-rose-400">{safetyScore.crimeRates.violent.toFixed(0)}</div>
                    <div className="text-xs text-white/50">Violent Crime Rate</div>
                    <div className="text-xs text-white/40">per 100k people</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-2xl font-bold text-amber-400">{safetyScore.crimeRates.property.toFixed(0)}</div>
                    <div className="text-xs text-white/50">Property Crime Rate</div>
                    <div className="text-xs text-white/40">per 100k people</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">
                      {safetyScore.vsNational < 0 ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <TrendingDown className="h-5 w-5" />
                          {Math.abs(safetyScore.vsNational)}%
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1">
                          <TrendingUp className="h-5 w-5" />
                          +{safetyScore.vsNational}%
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/50">vs National Average</div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Crime Breakdown</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(safetyScore.breakdown).map(([crime, score]) => (
                      <div key={crime} className="flex items-center justify-between">
                        <span className="text-white/60 capitalize text-sm">{crime}</span>
                        <span className={cn(
                          "font-medium",
                          score >= 70 ? "text-emerald-400" :
                            score >= 40 ? "text-amber-400" : "text-rose-400"
                        )}>{score}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* Mobility Tab */}
          <TabsContent value="mobility">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Footprints className="h-5 w-5 text-blue-400" />
                    Walk Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-blue-400 mb-2">{mobilityScores.walkScore.score}</div>
                  <p className="text-white/60">{mobilityScores.walkScore.description}</p>
                  <div className="mt-4 text-xs text-white/40">
                    Calculated based on amenity density
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Bus className="h-5 w-5 text-purple-400" />
                    Transit Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-purple-400 mb-2">{mobilityScores.transitScore.score}</div>
                  <p className="text-white/60">{mobilityScores.transitScore.description}</p>
                  <div className="mt-4 text-xs text-white/40">
                    Based on nearby bus stops and rail stations
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Bike className="h-5 w-5 text-cyan-400" />
                    Bike Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-cyan-400 mb-2">{mobilityScores.bikeScore.score}</div>
                  <p className="text-white/60">{mobilityScores.bikeScore.description}</p>
                  <div className="mt-4 text-xs text-white/40">
                    Estimated from walkability and transit data
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Amenities Tab */}
          <TabsContent value="amenities">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Store className="h-5 w-5 text-amber-400" />
                  Nearby Places (within {maxDistance} mi)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Distance Slider */}
                <div className="flex items-center gap-3 mb-6 bg-white/5 rounded-lg p-3">
                  <span className="text-white/60 text-sm whitespace-nowrap">0.5 mi</span>
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.5}
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(Number(e.target.value))}
                    className="flex-1 accent-emerald-400 cursor-pointer"
                  />
                  <span className="text-white/60 text-sm whitespace-nowrap">2 mi</span>
                  <span className="bg-emerald-500/20 text-emerald-400 text-sm font-medium px-2 py-0.5 rounded-md whitespace-nowrap">
                    {maxDistance} mi
                  </span>
                </div>

                {amenitiesScore.isFoodDesert && (
                  <div className="bg-rose-500/20 border border-rose-500/30 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 text-rose-400 font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      Food Desert Warning
                    </div>
                    <p className="text-white/60 text-sm mt-1">
                      No grocery stores found within 1 mile walking distance
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-white font-medium">All Nearby Places</h4>
                  <div className="flex items-center gap-3">
                    {/* Map / List toggle */}
                    <div className="flex bg-white/5 rounded-lg p-0.5">
                      <button
                        onClick={() => setViewMode("map")}
                        className={cn(
                          "p-1.5 rounded-md transition-colors",
                          viewMode === "map"
                            ? "bg-white/15 text-white"
                            : "text-white/50 hover:text-white/80"
                        )}
                      >
                        <Map className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={cn(
                          "p-1.5 rounded-md transition-colors",
                          viewMode === "list"
                            ? "bg-white/15 text-white"
                            : "text-white/50 hover:text-white/80"
                        )}
                      >
                        <List className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="text-xs text-white/40">{shownPois.length} place{shownPois.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>

                {/* Category legend – click to filter */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
                  {[...new Set(displayPois.map((p: any) => p.category as string))].map((cat: string) => {
                    const style = CATEGORY_STYLES[cat] || DEFAULT_STYLE;
                    const isActive = filterCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setFilterCategory(isActive ? null : cat)}
                        className={cn(
                          "flex items-center gap-1.5 transition-opacity",
                          isActive ? "opacity-100" : filterCategory ? "opacity-40 hover:opacity-70" : "opacity-100 hover:opacity-80"
                        )}
                      >
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: style.color, fontSize: "12px" }}
                        >
                          {style.emoji}
                        </span>
                        <span className="text-xs text-white/55 capitalize">{cat}</span>
                      </button>
                    );
                  })}
                </div>

                {viewMode === "map" ? (
                  <POIMap
                    center={location.coordinates}
                    pois={shownPois}
                    radiusMiles={maxDistance}
                    selectedPoiId={selectedPoiId}
                    initialZoom={13}
                  />
                ) : shownPois.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {shownPois.map((poi: any) => (
                      <button
                        key={poi.id}
                        onClick={() => handlePoiClick(poi.id)}
                        className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white/70">
                            <POIIcon category={poi.category} />
                          </div>
                          <div className="text-left">
                            <div className="text-white font-medium">{poi.name}</div>
                            <div className="text-xs text-white/50 capitalize">{poi.category.replace("_", " ")}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white/70">{poi.distance?.toFixed(2)} mi</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/40 text-sm">No nearby places found</p>
                )}

              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 md:flex-row">
          <div className="flex items-center gap-2">
            <img src="/city-pulse-logo.png" alt="CityPulse" className="h-5 w-5 rounded" />
            <span className="font-semibold text-white">CityPulse</span>
          </div>
          <p className="text-sm text-white/50">
            © 2026 CityPulse. Neighborhood Intelligence Platform.
          </p>
        </div>
      </footer>
    </div>
  );
}
