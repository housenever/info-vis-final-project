import React, { Component } from "react";
import _ from "underscore";
import { CrimeMap } from "../crime-map/CrimeMap";
import { Statistics } from "../statistics/Statistics";
import {
  fetchCrimes,
  fetchAggregatedCrimeTypes,
  fetchAggregatedCities,
  fetchAggregatedRegions,
  fetchAggregatedHours,
  fetchAggregatedMonths,
} from "../../util/api";
import "./App.css";
import { LoadingComponent } from "../loading-component/LoadingComponent";
import { getRegionPosition } from "../../util/regions";

export class App extends Component {
  constructor() {
    super();
    this.boundingBox = {
      sw: {
        lng: -50.38297162496275,
        lat: 48.31125180222088,
      },
      ne: {
        lng: 81.98030962503356,
        lat: 72.05983593722306,
      },
    };
    this.state = {
      timeRange: ["22/05/2017", "23/06/2017"],
      crimes: Promise.resolve([]),
      crimesByType: Promise.resolve([]),
      crimesByCity: Promise.resolve([]),
      crimesByRegion: Promise.resolve([]),
      hourlyDistribution: _.range(0, 24).map(v => 0),
      hourRange: {
        min: 1,
        max: 6,
      },
      monthlyDistribution: {
        values: [],
        labels: [],
      },
      selectedCrime: undefined,
      theme: "light",
      language: "swedish",
      isStatisticBarHidden: false,
      deselectedCrimeTypes: [],
    };
    this.mapCenter = [18.4006, 59.1582];
    this.mapZoom = [8];
  }

  onTimeRangeChange = timeRange => {
    this.setState({
      timeRange,
    });
    this.fetchCrimesWithDelay();
  };
  onHourRangeChange = hourRange => {
    this.setState({ hourRange }, this.fetchCrimesWithDelay);
  };
  onCrimeSelected = crime => {
    this.setState({
      selectedCrime: crime,
    });
  };
  onCrimeTypeClick = ({ id }) => {
    const set = new Set(this.state.deselectedCrimeTypes);
    const deselectedCrimeTypes = set.has(id)
      ? this.state.deselectedCrimeTypes.filter(
          crimeTypeId => crimeTypeId !== id,
        )
      : [...this.state.deselectedCrimeTypes, id];
    this.setState({
      deselectedCrimeTypes,
    });
  };

  onClearButtonClick = () => {
    this.setState({
      deselectedCrimeTypes : [],
    });
  };

  getCommonQueryParams = () => {
    return {
      startDate: this.state.timeRange[0],
      endDate: this.state.timeRange[1],
      boundingBox: this.boundingBox,
      startHour: this.state.hourRange.min,
      endHour: this.state.hourRange.max,
    };
  };
  fetchCrimesWithDelay = _.debounce(() => {
    this.setState({
      crimesByType: fetchAggregatedCrimeTypes(this.getCommonQueryParams()),
      crimesByCity: fetchAggregatedCities(this.getCommonQueryParams()),
      crimesByRegion: fetchAggregatedRegions(this.getCommonQueryParams()),
      crimes: fetchCrimes(this.getCommonQueryParams()),
    });
    fetchAggregatedHours({
      startDate: this.state.timeRange[0],
      endDate: this.state.timeRange[1],
      boundingBox: this.boundingBox,
    })
      .then(data => {
        this.setState({
          hourlyDistribution: data,
        });
      })
      .catch(error => {
        console.error(error);
      });
  }, 1500);
  onBoundingBoxChange = ({ ne, sw }) => {
    this.boundingBox.sw = sw;
    this.boundingBox.ne = ne;
    this.fetchCrimesWithDelay();
  };
  componentDidMount() {
    this.fetchCrimesWithDelay();
    fetchAggregatedMonths({
      startDate: "13/10/2016",
      endDate: "14/02/2018",
      boundingBox: this.boundingBox,
    })
      .then(data => {
        this.setState({
          monthlyDistribution: data,
        });
      })
      .catch(error => {
        console.error(error);
      });
  }

  getLocation = () => {
    const location = new Promise(resolve => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
          resolve(position);
        });
      }
    });
    return location;
  };

  onRegionSelected = region_name => {
    var location = getRegionPosition(region_name);
    if (location) {
      this.mapCenter = location;
      this.mapZoom = [8];
      this.onBoundingBoxChange(this.boundingBox);
    }
  };

  onCitySelected = location => {
    this.mapCenter = location;
    this.mapZoom = [11];
    this.onBoundingBoxChange(this.boundingBox);
  };

  handleClick = () => {
    this.getLocation().then(position => {
      this.mapCenter = [position.coords.longitude, position.coords.latitude];
      this.mapZoom = [10];
      this.onBoundingBoxChange(this.boundingBox);
    });
  };

  onCrimeDeselect = () => {
    this.setState({
      selectedCrime: undefined,
    });
  };
  onThemeChange = theme => {
    this.setState({ theme });
  };
  onLanguageChange = language => {
    this.setState({ language });
  };

  toggleStatisticsBar = () => {
    this.setState({
      isStatisticBarHidden: !this.state.isStatisticBarHidden,
    });
  };
  getFilteredCrimes = () => {
    return this.state.crimes.then(crimes =>
      crimes.filter(crime => {
        return this.state.deselectedCrimeTypes.indexOf(crime.crimeType) === -1;
      }),
    );
  };

  render() {
    
    const className =
      this.state.theme === "light" ? "container light-theme" : "container";
    return (
      <div className={className}>
        <LoadingComponent
          onBoundingBoxChange={this.onBoundingBoxChange}
          onRender={this.onBoundingBoxChange}
          center={this.mapCenter}
          zoom={this.mapZoom}
          onCrimeSelected={this.onCrimeSelected}
          selectedCrime={this.state.selectedCrime}
          onCrimeDeselect={this.onCrimeDeselect}
          data={this.getFilteredCrimes()}
          wrappedComponent={CrimeMap}
          dataLabel="crimes"
          containerClassName="statistics-box-loader-container"
          theme={this.state.theme}
          language={this.state.language}
          onLanguageChange={this.onLanguageChange}
          onThemeChange={this.onThemeChange}
          deselectedCrimeTypes={this.state.deselectedCrimeTypes}
          isStatisticBarHidden={this.state.isStatisticBarHidden}
        />
        <Statistics
          crimesByType={this.state.crimesByType}
          crimesByCity={this.state.crimesByCity}
          crimesByRegion={this.state.crimesByRegion}
          deselectedCrimeTypes={this.state.deselectedCrimeTypes}
          onCrimeTypeClick={this.onCrimeTypeClick}
          onClearButtonClick={this.onClearButtonClick}
          onRegionSelected={this.onRegionSelected}
          onCitySelected={this.onCitySelected}
          timeRange={this.state.timeRange}
          hourlyDistribution={this.state.hourlyDistribution}
          monthlyDistribution={this.state.monthlyDistribution}
          timeRangeSpan={["01/11/2016", "01/02/2018"]}
          onTimeRangeChange={this.onTimeRangeChange}
          hourRange={this.state.hourRange}
          onHourRangeChange={this.onHourRangeChange}
          handleClick={this.handleClick}
          theme={this.state.theme}
          language={this.state.language}
          isStatisticBarHidden={this.state.isStatisticBarHidden}
          toggleStatisticsBar={this.toggleStatisticsBar}
        />
      </div>
    );
  }
}

export default App;
