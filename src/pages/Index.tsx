import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Search, Shield, Footprints, ShoppingCart, Bus, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { autocomplete, type AutocompletePrediction } from "@/api/client";
import { cn } from "@/lib/utils";

const Index = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<AutocompletePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Handle click outside to close predictions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowPredictions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced autocomplete
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchQuery.length < 3) {
      setPredictions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const response = await autocomplete(searchQuery);
      if (response.success && response.data) {
        setPredictions(response.data);
        setShowPredictions(true);
      }
      setIsSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  const handlePredictionClick = (prediction: AutocompletePrediction) => {
    setShowPredictions(false);
    setSearchQuery(prediction.description);
    // Navigate with coordinates since we have them from Nominatim
    navigate(`/pulse?lat=${prediction.lat}&lng=${prediction.lng}&address=${encodeURIComponent(prediction.description)}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (predictions.length > 0) {
      handlePredictionClick(predictions[0]);
    } else if (searchQuery.length >= 3) {
      // Direct address search
      navigate(`/pulse?address=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src="/city-pulse-logo.png" alt="CityPulse" className="h-9 w-9 rounded-lg" />
            <span className="text-xl font-semibold text-white">CityPulse</span>
          </div>
          <nav className="flex items-center gap-4">
            <a href="#features" className="text-sm text-white/70 hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-white/70 hover:text-white transition-colors">
              How it Works
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-4 pt-20 pb-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 text-sm font-medium text-emerald-300">
            <Sparkles className="h-4 w-4" />
            Georgia Neighborhood Intelligence - 100% Free Data
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
            Know Your{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Neighborhood
            </span>
            {" "}Before You Move
          </h1>

          <p className="mb-12 text-lg text-white/70 md:text-xl max-w-2xl mx-auto">
            Get instant insights on safety, walkability, transit access, and local amenities for any address or ZIP code. Make informed decisions with real data.
          </p>

          {/* Search Box */}
          <div ref={searchRef} className="relative max-w-2xl mx-auto">
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50">
                  <Search className="h-5 w-5" />
                </div>
                <Input
                  type="text"
                  placeholder="Search any Georgia address, city, or ZIP code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => predictions.length > 0 && setShowPredictions(true)}
                  className="h-16 pl-12 pr-32 text-lg bg-white/10 backdrop-blur-xl border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-emerald-400/50 rounded-2xl"
                />
                <Button
                  type="submit"
                  disabled={!searchQuery || isSearching}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-12 px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium rounded-xl"
                >
                  {isSearching ? (
                    <span className="animate-pulse">Searching...</span>
                  ) : (
                    <>
                      Analyze
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Autocomplete Predictions */}
            {showPredictions && predictions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                {predictions.map((prediction) => (
                  <button
                    key={prediction.placeId}
                    onClick={() => handlePredictionClick(prediction)}
                    className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-white">{prediction.mainText}</p>
                        <p className="text-sm text-white/50">{prediction.secondaryText}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { label: "Georgia Counties", value: "159" },
              { label: "ZIP Codes", value: "700+" },
              { label: "Data Sources", value: "3" },
              { label: "API Cost", value: "$0" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-white/50">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 bg-black/20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-white mb-4">
            Everything You Need to Know
          </h2>
          <p className="text-center text-white/60 mb-16 max-w-2xl mx-auto">
            We aggregate data from multiple sources to give you a comprehensive view of any neighborhood
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: Shield,
                title: "Safety Score",
                description: "FBI crime data by county with safety index compared to national averages",
                color: "emerald",
              },
              {
                icon: Footprints,
                title: "Walkability",
                description: "Custom walkability score calculated from OpenStreetMap amenity data",
                color: "blue",
              },
              {
                icon: Bus,
                title: "Transit Access",
                description: "Transit stops and routes from OpenStreetMap public transport data",
                color: "purple",
              },
              {
                icon: ShoppingCart,
                title: "Amenities",
                description: "Real-time POI data: restaurants, grocery stores, pharmacies, and more",
                color: "amber",
              },
            ].map((feature) => (
              <Card
                key={feature.title}
                className={cn(
                  "bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300",
                  "group cursor-default"
                )}
              >
                <CardContent className="p-6">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                      feature.color === "emerald" && "bg-emerald-500/20",
                      feature.color === "blue" && "bg-blue-500/20",
                      feature.color === "purple" && "bg-purple-500/20",
                      feature.color === "amber" && "bg-amber-500/20"
                    )}
                  >
                    <feature.icon
                      className={cn(
                        "h-6 w-6",
                        feature.color === "emerald" && "text-emerald-400",
                        feature.color === "blue" && "text-blue-400",
                        feature.color === "purple" && "text-purple-400",
                        feature.color === "amber" && "text-amber-400"
                      )}
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-white/60 text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="relative z-10 py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-white mb-16">
            How It Works
          </h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "1",
                title: "Search Any Location",
                description: "Enter an address, ZIP code, or neighborhood name to begin your analysis.",
              },
              {
                step: "2",
                title: "Get Instant Insights",
                description: "Our algorithm aggregates data from multiple sources in real-time.",
              },
              {
                step: "3",
                title: "Compare & Decide",
                description: "Compare multiple locations side-by-side to find your perfect match.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-xl font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{item.title}</h3>
                <p className="text-sm text-white/60">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 bg-gradient-to-r from-emerald-600/20 to-cyan-600/20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Explore?
          </h2>
          <p className="text-white/70 mb-8 max-w-lg mx-auto">
            Start analyzing neighborhoods now. No account required for basic searches.
          </p>
          <Button
            onClick={() => document.querySelector('input')?.focus()}
            size="lg"
            className="bg-white text-slate-900 hover:bg-white/90 font-medium px-8"
          >
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

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
};

export default Index;
