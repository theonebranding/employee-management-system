import Lottie from 'lottie-react';
import { BarChart, Globe, Lock, Menu, Shield, Users, X, Zap } from 'lucide-react';
import React from 'react';

import heroAnimation from '../../assets/animations/hero_animation.json';

const Home = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  // const stats = [
  //   { value: '10,000+', label: 'Happy Clients' },
  //   { value: '99.9%', label: 'System Uptime' },
  //   { value: '500K+', label: 'Managed Employees' },
  //   { value: '24/7', label: 'Support Availability' },
  // ];

  const features = [
    {
      icon: <Shield className="w-6 h-6 text-yellow-500" />,
      title: 'Employee Management',
      description: 'Efficiently manage employee data, roles, and performance with intuitive tools.',
    },
    {
      icon: <Zap className="w-6 h-6 text-yellow-500" />,
      title: 'Client Onboarding',
      description:
        'Streamline client onboarding with automated workflows and personalized portals.',
    },
    {
      icon: <Users className="w-6 h-6 text-yellow-500" />,
      title: 'Collaboration Tools',
      description:
        'Enhance team and client collaboration with shared workspaces and project tracking.',
    },
    {
      icon: <BarChart className="w-6 h-6 text-yellow-500" />,
      title: 'Performance Analytics',
      description: 'Track key metrics and generate insights on employee and client activities.',
    },
    {
      icon: <Lock className="w-6 h-6 text-yellow-500" />,
      title: 'Secure Access Management',
      description: 'Ensure secure access to employee and client data with role-based permissions.',
    },
    {
      icon: <Globe className="w-6 h-6 text-yellow-500" />,
      title: 'Remote Management',
      description: 'Manage employees and clients globally with cloud-based tools and 24/7 access.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-black text-white sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-yellow-600">
              The OneBranding
            </h1>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <a
                href="/login"
                className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition shadow-sm"
              >
                Log In
              </a>
            </nav>

            {/* Mobile Menu Toggle */}
            <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden py-4">
              <div className="flex flex-col space-y-4">
                <a href="#features" className="text-gray-300 hover:text-yellow-500">
                  Features
                </a>
                <a href="#stats" className="text-gray-300 hover:text-yellow-500">
                  Stats
                </a>
                <div className="pt-4">
                  <a
                    href="/login"
                    className="block px-4 py-2 bg-yellow-500 text-black rounded-lg text-center hover:bg-yellow-600 transition"
                  >
                    Log In
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative bg-gradient-to-b from-black to-gray-900 text-white overflow-hidden">
          {/* Animated Background */}
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-yellow-400 opacity-30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-72 h-72 bg-yellow-600 opacity-20 rounded-full blur-2xl animate-bounce"></div>

          <div className="container mx-auto px-4 py-20">
            <div className="grid lg:grid-cols-2 items-center gap-12">
              {/* Left Column */}
              <div className="animate-fade-in">
                <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight">
                  Manage Your{' '}
                  <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                    Employees and Payroll
                  </span>{' '}
                  Effortlessly
                </h1>
                <p className="mt-6 text-lg text-gray-300">
                  OneBranding IT Solutions helps streamline employee management, improve client
                  collaboration, and boost operational efficiency with cutting-edge tools.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                  <a
                    href="/login"
                    className="px-8 py-4 bg-yellow-500 text-black font-medium rounded-lg shadow-md hover:bg-yellow-600 transition"
                  >
                    Log In
                  </a>
                </div>
              </div>

              {/* Right Column */}
              <div className="relative">
                <div className="w-full h-[550px] rounded-lg shadow-lg relative overflow-hidden">
                  <Lottie animationData={heroAnimation} loop={true} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section
        <section id="stats" className="bg-grey-900 text-yellow-500 py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
              {stats.map((stat, index) => (
                <div key={index} className="text-black">
                  <div className="text-4xl font-bold">{stat.value}</div>
                  <div className="text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section> */}

        {/* Features Section */}
        <section id="features" className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h3 className="text-3xl font-bold text-black mb-4">
                Tailored Solutions for Your Business
              </h3>
              <p className="text-lg text-gray-700">
                Explore features that help transform your workflows.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="p-6 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-lg transition"
                >
                  <div className="mb-4 flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full">
                    {feature.icon}
                  </div>
                  <h4 className="text-xl font-semibold text-black mb-2">{feature.title}</h4>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center text-sm">
            <p>© {new Date().getFullYear()} OneBranding IT Solutions. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
